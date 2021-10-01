import mongoose from "mongoose";
import bcrypt from "bcrypt";

const { Schema, model } = mongoose;

const authorSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    birthDate: { type: Date },
    avatar: { type: String, required: true },
    googleId: { type: String },
    role: {
      type: String,
      required: true,
      enum: ["Author", "Admin"],
      default: "Author",
    },
  },
  { timestamps: true }
);

//  ======== Hashing passwords
// creating new
authorSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const hash = await bcrypt.hash(this.password, 12);
  this.password = hash;

  return next();
});

// Updating existent
authorSchema.pre("findOneAndUpdate", async function () {
  const update = this.getUpdate();
  const { password: plainPwd } = update;

  if (plainPwd) {
    const password = await bcrypt.hash(plainPwd, 10);
    this.setUpdate({ ...update, password });
  }
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
authorSchema.statics.checkCredentials = async function (email, password) {
  const author = await this.findOne({ email });
  if (author) {
    const isMatch = await bcrypt.compare(password, author.password);
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
