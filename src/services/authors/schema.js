import mongoose from "mongoose";
import bcrypt from "bcrypt";

const { Schema, model } = mongoose;

const authorSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    birthDate: { type: Date, required: true },
    avatar: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ["Author", "Admin"],
      default: "Author",
    },
  },
  { timestamps: true }
);

// Hash passwords
authorSchema.pre("save", async function (next) {
  const plainPassword = this.password;

  if (this.isModified("password")) {
    this.password = await bcrypt.hash(plainPassword, 10);
  }
  next();
});

//Showing json without passwords
authorSchema.methods.toJSON = function () {
  const authorObject = this.toObject();
  delete authorObject.password;
  delete authorObject.__v;
  return authorObject;
};

//Pagination
authorSchema.static("findAuthors", async function (query) {
  const total = await this.countDocuments(query.criteria);
  const authors = await this.find(query.criteria, query.options.fields)
    .sort(query.options.sort)
    .limit(query.options.limit)
    .skip(query.options.skip);

  return { total, authors };
});

//Checking credentials
authorSchema.statics.checkCredentials = async function (email, plainPassword) {
  const author = await this.findOne({ email });
  if (author) {
    const isMatch = await bcrypt.compare(plainPassword, author.password);
    if (isMatch) {
      return author;
    } else {
      return null;
    }
  } else {
    return null;
  }
};

export default model("author", authorSchema);
