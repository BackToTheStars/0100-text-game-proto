const Comment = require("../models/Comment");

const saveComment = async (req, res) => {
  const {id, comment} = req.body; // деструктуризатор
  const commentModel = new Comment(id, comment);
  await commentModel.save();
  res.json(commentModel);
};

const getComments = async (req, res) => {
  const comments = await Comment.find();
  res.json(comments);
};

module.exports = {
  saveComment,
  getComments,
};





