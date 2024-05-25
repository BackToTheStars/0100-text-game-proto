const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SnapshotSchema = new Schema(
  {
    typeName: String,
    params: Schema.Types.Mixed,
    info: Schema.Types.Mixed,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Snapshot', SnapshotSchema);
