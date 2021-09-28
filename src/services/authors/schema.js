import mongoose from "mongoose";
const { Schema, model } = mongoose;

const authorSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    birthDate: { type: Date, required: true },
    avatar: { type: String, required: true },
  },
  { timestamps: true }
);

authorSchema.static("findAuthors", async function (query) {
  const total = await this.countDocuments(query.criteria);
  const authors = await this.find(query.criteria, query.options.fields)
    .sort(query.options.sort)
    .limit(query.options.limit)
    .skip(query.options.skip);

  return { total, authors };
});

export default model("author", authorSchema);
