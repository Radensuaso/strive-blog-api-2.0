import mongoose from "mongoose";
const { Schema, model } = mongoose;

const blogPostSchema = new Schema(
  {
    category: { type: String, required: true },
    title: { type: String, required: true },
    cover: { type: String, required: true },
    readTime: {
      value: { type: Number, required: true },
      unit: { type: String, required: true },
    },
    author: { type: Schema.Types.ObjectId, ref: "author", required: true },
    content: { type: String, required: true },
    reviews: [
      {
        comment: { type: String, required: true },
        rate: { type: Number, required: true },
      },
    ],
    likes: [{ type: Schema.Types.ObjectId, ref: "author" }],
  },
  { timestamps: true }
);

blogPostSchema.static("findBlogPosts", async function (query) {
  const total = await this.countDocuments(query.criteria);
  const blogPosts = await this.find(query.criteria, query.options.fields)
    .sort(query.options.sort)
    .limit(query.options.limit)
    .skip(query.options.skip)
    .populate("authors");

  return { total, blogPosts };
});

export default model("blogPost", blogPostSchema);
