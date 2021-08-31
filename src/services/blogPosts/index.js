import express from "express";
import {
  readBlogPosts,
  writeBlogPosts,
  saveCoverCloudinary,
  deletePDFFile,
} from "../../lib/writeReadTools.js";
import {
  getBlogPostPDFReadableStream,
  generateBlogPostPDFAsync,
} from "../../lib/pdfMakeTools.js";
import { pipeline } from "stream";
import { sendEmail } from "../../lib/emailMakeTools.js";
import uniqid from "uniqid";
import createHttpError from "http-errors";
import { validationResult } from "express-validator";
import { blogPostValidation, blogPostCommentValidation } from "./validation.js";
import multer from "multer";
import BlogPostModel from "./schema.js";

const blogPostsRouter = express.Router(); // provide Routing

// =============== Post Blog Post =================
blogPostsRouter.post("/", async (req, res, next) => {
  try {
    const newBlogPost = new BlogPostModel(req.body);
    const savedBlogPost = await newBlogPost.save();
    res.status(201).send(savedBlogPost);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

// =============== Get all Blog Posts =================

blogPostsRouter.get("/", async (req, res, next) => {
  try {
    const blogPosts = await BlogPostModel.find();

    res.send(blogPosts);
  } catch (error) {
    next(error);
  }
});

// =============== Get single Blog Post =================
blogPostsRouter.get("/:blogPostId", async (req, res, next) => {
  try {
    const { blogPostId } = req.params;
    const blogPost = await BlogPostModel.findById(blogPostId);
    if (blogPost) {
      res.send(blogPost);
    } else {
      next(createHttpError(404, `Blog Post with id: ${blogPostId} not found!`));
    }
  } catch (error) {
    next(error);
  }
});

// =============== Update Blog Post =================
blogPostsRouter.put("/:blogPostId", async (req, res, next) => {
  try {
    const { blogPostId } = req.params;

    const updatedBlogPost = await BlogPostModel.findByIdAndUpdate(
      blogPostId,
      req.body,
      { new: true }
    );
    if (updatedBlogPost) {
      res.send(updatedBlogPost);
    } else {
      next(createHttpError(404, `Blog Post with id: ${blogPostId} not found!`));
    }
  } catch (error) {
    next(error);
  }
});

// =============== Delete Blog Post =================
blogPostsRouter.delete("/:blogPostId", async (req, res, next) => {
  try {
    const { blogPostId } = req.params;
    const deletedBlogPost = await BlogPostModel.findByIdAndDelete(blogPostId);
    if (deletedBlogPost) {
      res.send(deletedBlogPost);
    } else {
      next(createHttpError(404, `Blog Post with id: ${blogPostId} not found!`));
    }
  } catch (error) {
    next(error);
  }
});

// =============== BLOG POSTS COVER =================
blogPostsRouter.post(
  "/:blogPostId/uploadCover",
  multer({ storage: saveCoverCloudinary }).single("cover"),
  async (req, res, next) => {
    try {
      const paramsId = req.params._id;
      const blogPosts = await readBlogPosts();
      const blogPost = blogPosts.find((p) => p._id === paramsId);
      if (blogPost) {
        const coverUrl = req.file.path;
        const updatedBlogPost = { ...blogPost, cover: coverUrl };
        const remainingBlogPosts = blogPosts.filter((p) => p._id !== paramsId);

        remainingBlogPosts.push(updatedBlogPost);
        await writeBlogPosts(remainingBlogPosts);
        res.send(updatedBlogPost);
      } else {
        next(
          createHttpError(
            404,
            `Blog post with the id: ${paramsId} was not found.`
          )
        );
      }
    } catch (error) {
      next(error);
    }
  }
);

// =============== Get all BLOG POSTS COMMENTS =================
blogPostsRouter.get("/:blogPostId/comments", async (req, res, next) => {
  try {
    const paramsId = req.params._id;
    const blogPosts = await readBlogPosts();
    const blogPost = blogPosts.find((p) => p._id === paramsId);
    if (blogPost) {
      const blogPostComments = blogPost.comments;
      res.send(blogPostComments);
    } else {
      next(
        createHttpError(
          404,
          `Blog post with the id: ${paramsId} was not found.`
        )
      );
    }
  } catch (error) {
    next(error);
  }
});

// =============== post BLOG POSTS COMMENTS =================
blogPostsRouter.post(
  "/:blogPostId/comments",
  blogPostCommentValidation,
  async (req, res, next) => {
    try {
      const paramsId = req.params._id;
      const blogPosts = await readBlogPosts();
      const blogPost = blogPosts.find((p) => p._id === paramsId);
      if (blogPost) {
        const errorList = validationResult(req);
        if (errorList.isEmpty()) {
          //create and push new comment to blog post comments
          const newComment = { _id: uniqid(), ...req.body };
          const blogPostComments = blogPost.comments;
          blogPostComments.push(newComment);

          //rewrite the blog post with the new comment
          const remainingBlogPosts = blogPosts.filter(
            (p) => p._id !== paramsId
          );
          const updatedBlogPost = { ...blogPost, comments: blogPostComments };
          remainingBlogPosts.push(updatedBlogPost);
          await writeBlogPosts(remainingBlogPosts);
          res.send("Comment uploaded!");
        } else {
          next(createHttpError(400, { errorList }));
        }
      } else {
        next(
          createHttpError(
            404,
            `Blog post with the id: ${paramsId} was not found.`
          )
        );
      }
    } catch (error) {
      next(error);
    }
  }
);

// ================== DOWNLOAD BLOG POST AS PDF =================
blogPostsRouter.get("/:blogPostId/downloadPDF", async (req, res, next) => {
  try {
    const paramsID = req.params._id;
    const blogPosts = await readBlogPosts();
    const blogPost = blogPosts.find((p) => p._id === paramsID);
    if (blogPost) {
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=blog-post.pdf"
      ); // this enables to download the pdf
      const source = await getBlogPostPDFReadableStream(blogPost);
      const destination = res;

      pipeline(source, destination, (err) => {
        if (err) next(err);
      });
    } else {
      res.send(
        createHttpError(404, `Blog post with the id: ${paramsID} not found.`)
      );
    }
  } catch (error) {
    next(error);
  }
});

// ================= SEND PDF AS EMAIL ======================
blogPostsRouter.get("/:blogPostId/sendEmail", async (req, res, next) => {
  try {
    const paramsID = req.params._id;
    const blogPosts = await readBlogPosts();
    const blogPost = blogPosts.find((p) => p._id === paramsID);
    if (blogPost) {
      const blogPostPDFPath = await generateBlogPostPDFAsync(blogPost);
      await sendEmail(blogPost, blogPostPDFPath);
      await deletePDFFile(blogPostPDFPath);
      res.send("Email sent!");
    } else {
      res.send(
        createHttpError(404, `Blog post with the id: ${paramsID} not found.`)
      );
    }
  } catch (error) {
    next(error);
  }
});

export default blogPostsRouter; // export Routing
