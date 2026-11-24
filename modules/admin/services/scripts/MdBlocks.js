const mongoose = require('mongoose');
const Turn = require('../../../game/models/Turn');
const { TEMPLATE_MD } = require('../../../../config/turn');
const {
  BLOCK_LIMIT,
  splitBlocksCounted,
  joinBlocks,
  splitBlocks,
  rowsFromBlocks,
  markdownFromRows,
} = require('../../../game/services/mdBlocks');

// Статья md из поля markdown — в ряды одной колонкой ({ id, left, right: '' }), по блокам верхнего уровня.
// Поле markdown остаётся как было: откат возвращает его побайтно, если ряды с прохода не правились, и склейку
// рядов, если правились. Метка прохода — mdBlocksPass, время запуска. Статьи, созданные сразу рядами (без метки),
// откат тоже склеивает в markdown: старый клиент иначе показал бы их пустыми; повторный run делит их снова.

const LIST_LIMIT = 50;
const { calculateObjectSize } = mongoose.mongo.BSON;

const hasRows = (turn) => Array.isArray(turn.rows) && turn.rows.length > 0;
const hasMark = (turn) => turn.mdBlocksPass != null;

const kb = (size) => `${(size / 1024).toFixed(1)} KB`;
const bytes = (text) => Buffer.byteLength(text, 'utf8');

const classify = (turn) => {
  if (hasRows(turn)) return hasMark(turn) ? 'migrated' : 'inRows';
  if (typeof turn.markdown !== 'string') return 'noText';
  return 'toSplit';
};

// План одной статьи: блоки, сколько больших поделено, размер документа после записи рядов.
const planArticle = (turn) => {
  const { blocks, oversized } = splitBlocksCounted(turn.markdown);
  const rows = blocks.map((left) => ({ id: 'x'.repeat(14), left, right: '' }));
  return {
    _id: '' + turn._id,
    gameId: '' + turn.gameId,
    size: bytes(turn.markdown),
    blocks,
    oversized,
    docAfter: calculateObjectSize({ ...turn, rows, mdBlocksPass: new Date() }),
  };
};

const limited = (lines) =>
  lines.length > LIST_LIMIT ? [...lines.slice(0, LIST_LIMIT), `  … и ещё ${lines.length - LIST_LIMIT}`] : lines;

const describePlan = (turns) => {
  const groups = { toSplit: [], migrated: [], inRows: [], noText: [] };
  for (const turn of turns) groups[classify(turn)].push(turn);
  const plans = [];
  const failed = [];
  for (const turn of groups.toSplit) {
    try {
      plans.push(planArticle(turn));
    } catch (err) {
      failed.push(`failed ${turn._id}: ${err.message}`);
    }
  }
  const work = plans.filter((plan) => plan.blocks.length);
  const empty = plans.length - work.length;
  const largest = plans.reduce((top, plan) => (!top || plan.docAfter > top.docAfter ? plan : top), null);
  const largestNow = turns.reduce((top, turn) => {
    const size = calculateObjectSize(turn);
    return !top || size > top.size ? { _id: '' + turn._id, size } : top;
  }, null);
  const sum = (count) => work.reduce((total, plan) => total + count(plan), 0);
  const lines = [
    `Статей md: ${turns.length}`,
    `  без рядов, с текстом — к делению: ${work.length} (${kb(sum((plan) => plan.size))}), пустой текст: ${empty}`,
    `  в рядах с меткой прохода: ${groups.migrated.length}`,
    `  в рядах без метки — созданы рядами, откат склеит: ${groups.inRows.length}`,
    `  без рядов и без текста: ${groups.noText.length}`,
    `Блоков получится: ${sum((plan) => plan.blocks.length)}; ` +
      `больших блоков (> ${kb(BLOCK_LIMIT)}) поделится: ${sum((plan) => plan.oversized)}`,
    largest
      ? `Самый большой документ после: ${largest._id} — ${kb(largest.docAfter)}`
      : 'Самый большой документ после: —',
    largestNow ? `Самый большой документ статьи сейчас: ${largestNow._id} — ${kb(largestNow.size)}` : 'Статей нет',
    ...limited(
      work.map(
        (plan) =>
          `  ${plan._id} (игра ${plan.gameId}): ${kb(plan.size)} → ${plan.blocks.length} блоков` +
          (plan.oversized ? `, поделено больших: ${plan.oversized}` : '')
      )
    ),
  ];
  return { groups, work, lines, failed, largestNow };
};

const createMdBlocksCommands = ({ Turn: model, now = () => new Date() }) => {
  const loadArticles = () => model.find({ contentType: TEMPLATE_MD }).lean();

  const check = async () => {
    const { lines, failed } = describePlan(await loadArticles());
    return [failed.length === 0, ['Статья md в ряды — отчёт', ...lines, ...failed]];
  };

  const run = async () => {
    const pass = now();
    const articles = await loadArticles();
    const { work, lines, failed } = describePlan(articles);
    const turns = new Map(articles.map((turn) => ['' + turn._id, turn]));
    let written = 0;
    const unmatched = [];
    for (const plan of work) {
      const turn = turns.get(plan._id);
      try {
        // Миграция — не правка хода: updatedAt не трогаем; ход, изменённый после чтения, не пишется.
        const result = await model.updateOne(
          { _id: turn._id, 'rows.0': { $exists: false }, updatedAt: turn.updatedAt ?? null },
          { $set: { rows: rowsFromBlocks(plan.blocks), mdBlocksPass: pass } },
          { timestamps: false }
        );
        if (result.matchedCount === 0) {
          unmatched.push(`not written ${plan._id}: the article changed or is gone since it was read`);
        } else {
          written += 1;
        }
      } catch (err) {
        failed.push(`failed ${plan._id}: ${err.message}`);
      }
    }
    const after = describePlan(await loadArticles());
    return [
      failed.length === 0 && unmatched.length === 0,
      [
        `Статья md в ряды — запуск, метка прохода ${pass.toISOString()}`,
        `Записано: ${written} из ${work.length}`,
        ...lines,
        `После запуска: к делению ${after.work.length}, в рядах с меткой ${after.groups.migrated.length}` +
          (after.largestNow ? `, самый большой документ ${after.largestNow._id} — ${kb(after.largestNow.size)}` : ''),
        ...unmatched,
        ...failed,
      ],
    ];
  };

  const revert = async () => {
    const articles = await loadArticles();
    const marked = articles.filter(hasMark);
    const madeInRows = articles.filter((turn) => classify(turn) === 'inRows');
    let restored = 0;
    let joined = 0;
    let madeJoined = 0;
    const unmatched = [];
    const failed = [];
    for (const turn of marked) {
      try {
        const rowsText = markdownFromRows(turn.rows);
        // Ряды не правились с прохода — исходник цел, возвращается он сам, побайтно.
        const untouched =
          typeof turn.markdown === 'string' && joinBlocks(splitBlocks(turn.markdown)) === rowsText;
        const markdown = untouched ? turn.markdown : rowsText;
        const result = await model.updateOne(
          { _id: turn._id, mdBlocksPass: turn.mdBlocksPass },
          { $set: { markdown }, $unset: { rows: 1, mdBlocksPass: 1 } },
          { timestamps: false }
        );
        if (result.matchedCount === 0) {
          unmatched.push(`not reverted ${turn._id}: the mark is gone since it was read`);
        } else if (untouched) {
          restored += 1;
        } else {
          joined += 1;
        }
      } catch (err) {
        failed.push(`failed ${turn._id}: ${err.message}`);
      }
    }
    for (const turn of madeInRows) {
      try {
        // Без метки и с той же версией: ряды, правленные после чтения, не затираются.
        const result = await model.updateOne(
          { _id: turn._id, mdBlocksPass: { $exists: false }, opsVersion: turn.opsVersion ?? null },
          { $set: { markdown: markdownFromRows(turn.rows) }, $unset: { rows: 1 } },
          { timestamps: false }
        );
        if (result.matchedCount === 0) {
          unmatched.push(`not reverted ${turn._id}: the rows changed since they were read`);
        } else {
          madeJoined += 1;
        }
      } catch (err) {
        failed.push(`failed ${turn._id}: ${err.message}`);
      }
    }
    const after = describePlan(await loadArticles());
    return [
      failed.length === 0 && unmatched.length === 0,
      [
        'Статья md в ряды — откат',
        `Статей с меткой прохода: ${marked.length}`,
        `  исходник возвращён как был: ${restored}`,
        `  ряды правились — текст склеен из рядов: ${joined}`,
        `созданы рядами — склеены: ${madeJoined} из ${madeInRows.length}`,
        `После отката: в рядах ${after.groups.migrated.length + after.groups.inRows.length}, без рядов с текстом ${after.work.length}`,
        ...unmatched,
        ...failed,
      ],
    ];
  };

  return { check, run, revert };
};

const { check, run, revert } = createMdBlocksCommands({ Turn });

module.exports = { classify, planArticle, createMdBlocksCommands, check, run, revert };
