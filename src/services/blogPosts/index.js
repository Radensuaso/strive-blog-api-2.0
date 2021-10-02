import express from "express";
import createHttpError from "http-errors";
import BlogPostModel from "../../schemas/blogPost.js";
import q2m from "query-to-mongo";
import tokenAuthMiddleware from "../../auth/tokenAuth.js";
import adminOnlyMiddleware from "../../auth/adminAuth.js";
import multer from "multer";
import { saveCoverCloudinary } from "../../lib/cloudinaryTools.js";
import {
  getBlogPostPDFReadableStream,
  generateBlogPostPDFAsync,
  deletePDFFile,
} from "../../lib/pdfMakeTools.js";
import { pipeline } from "stream";
import { sendEmail } from "../../lib/emailTools.js";
import { blogPostValidation } from "../../validation/blogPost.js";
import { validationResult } from "express-validator";

const blogPostsRouter = express.Router(); // provide Routing

// =============== Get all Blog Posts =================

blogPostsRouter.get("/", async (req, res, next) => {
  try {
    const query = q2m(req.query);
    const { total, blogPosts } = await BlogPostModel.findBlogPosts(query);

    res.send({ links: query.links("/blogPosts", total), total, blogPosts });
  } catch (error) {
    next(error);
  }
});

// =============== Post Blog Post =================
blogPostsRouter.post(
  "/stories",
  tokenAuthMiddleware,
  blogPostValidation,
  async (req, res, next) => {
    try {
      const errorList = validationResult(req);
      if (errorList.isEmpty()) {
        const newBlogPost = new BlogPostModel({
          ...req.body,
          author: req.user._id,
        });
        const savedBlogPost = await newBlogPost.save();
        res.status(201).send(savedBlogPost);
      } else {
        console.log("ERROR LIST", errorList);
        next(createHttpError(400, errorList));
      }
    } catch (error) {
      next(error);
    }
  }
);

// =============== post blog post cover =================
blogPostsRouter.post(
  "/:blogPostId/stories/uploadCover",
  tokenAuthMiddleware,
  multer({ storage: saveCoverCloudinary }).single("cover"),
  async (req, res, next) => {
    try {
      const authorId = req.user._id;
      const { blogPostId } = req.params;
      const coverUrl = req.file.path;
      const updatedBlogPost = await BlogPostModel.findOneAndUpdate(
        { _id: blogPostId, author: authorId },
        { cover: coverUrl },
        { new: true }
      );
      if (updatedBlogPost) {
        res.send(updatedBlogPost);
      } else {
        next(
          createHttpError(
            404,
            `Blog post with the id: ${blogPostId} was not found, or you have not permission to this blogPost.`
          )
        );
      }
    } catch (error) {
      next(error);
    }
  }
);

// =============== Get my Blog posts ========================
blogPostsRouter.get("/stories", tokenAuthMiddleware, async (req, res, next) => {
  try {
    const myBlogPosts = await BlogPostModel.find({
      author: req.user._id,
    }).populate("author");
    res.send(myBlogPosts);
  } catch (error) {
    next(error);
  }
});

// =============== Update my Blog post ========================
blogPostsRouter.put(
  "/:blogPostId/stories",
  tokenAuthMiddleware,
  async (req, res, next) => {
    try {
      const { blogPostId } = req.params;
      const authorId = req.user._id;

      const updatedBlogPost = await BlogPostModel.findOneAndUpdate(
        {
          _id: blogPostId,
          author: authorId,
        },
        req.body,
        { new: true }
      );
      if (updatedBlogPost) {
        res.send(updatedBlogPost);
      } else {
        next(
          createHttpError(
            404,
            `Blog Post with id: ${blogPostId} not found! Or you are not authorized to change this post.`
          )
        );
      }
    } catch (error) {
      next(error);
    }
  }
);

// =============== Delete my Blog post ========================
blogPostsRouter.delete(
  "/:blogPostId/stories",
  tokenAuthMiddleware,
  async (req, res, next) => {
    try {
      const { blogPostId } = req.params;
      const authorId = req.user._id;

      const deletedBlogPost = await BlogPostModel.findOneAndDelete({
        _id: blogPostId,
        author: authorId,
      });
      if (deletedBlogPost) {
        res.send(deletedBlogPost);
      } else {
        next(
          createHttpError(
            404,
            `Blog Post with id: ${blogPostId} not found! Or you are not authorized to change this post.`
          )
        );
      }
    } catch (error) {
      next(error);
    }
  }
);

// ================= likes in blogPosts ====================
blogPostsRouter.post(
  "/:blogPostId/likes/",
  tokenAuthMiddleware,
  async (req, res, next) => {
    try {
      const { blogPostId } = req.params;
      const authorId = req.user._id;
      const authorLiked = await BlogPostModel.findOne({
        _id: blogPostId,
        likes: authorId,
      });
      if (authorLiked) {
        const updatedBlogPost = await BlogPostModel.findByIdAndUpdate(
          blogPostId,
          {
            $pull: { likes: authorId },
          },
          { new: true, runValidators: true }
        );
        res.send(updatedBlogPost);
      } else {
        const updatedBlogPost = await BlogPostModel.findByIdAndUpdate(
          blogPostId,
          {
            $push: { likes: authorId },
          },
          { new: true, runValidators: true }
        );
        res.send(updatedBlogPost);
      }
    } catch (error) {
      next(error);
    }
  }
);

// =============== Get single Blog Post =================
blogPostsRouter.get("/:blogPostId", async (req, res, next) => {
  try {
    const { blogPostId } = req.params;
    const blogPost = await BlogPostModel.findById(blogPostId).populate(
      "author"
    );
    if (blogPost) {
      res.send(blogPost);
    } else {
      next(createHttpError(404, `Blog Post with id: ${blogPostId} not found!`));
    }
  } catch (error) {
    next(error);
  }
});

// =============== Delete Blog Post =================
blogPostsRouter.delete(
  "/:blogPostId",
  tokenAuthMiddleware,
  adminOnlyMiddleware,
  async (req, res, next) => {
    try {
      const { blogPostId } = req.params;
      const deletedBlogPost = await BlogPostModel.findByIdAndDelete(blogPostId);
      if (deletedBlogPost) {
        res.send(deletedBlogPost);
      } else {
        next(
          createHttpError(404, `Blog Post with id: ${blogPostId} not found!`)
        );
      }
    } catch (error) {
      next(error);
    }
  }
);

// ================== Download blog post as pdf =================
blogPostsRouter.get(
  "/:blogPostId/downloadPDF",
  tokenAuthMiddleware,
  async (req, res, next) => {
    try {
      const { blogPostId } = req.params;
      const blogPost = await BlogPostModel.findById(blogPostId);
      if (blogPost) {
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${blogPost.title}.pdf`
        ); // this enables to download the pdf
        const source = await getBlogPostPDFReadableStream(blogPost);

        pipeline(source, res, (err) => {
          if (err) next(err);
        });
      } else {
        res.send(
          createHttpError(
            404,
            `Blog post with the id: ${blogPostId} not found.`
          )
        );
      }
    } catch (error) {
      next(error);
    }
  }
);

// ================= send pdf as email ======================
blogPostsRouter.post(
  "/:blogPostId/sendEmail",
  tokenAuthMiddleware,
  async (req, res, next) => {
    try {
      const { email } = req.body;
      const { blogPostId } = req.params;
      const author = req.user;
      const blogPost = await BlogPostModel.findById(blogPostId);
      if (blogPost) {
        const blogPostPDFPath = await generateBlogPostPDFAsync(blogPost);
        if (email) {
          await sendEmail(blogPost, blogPostPDFPath, email, author);
          await deletePDFFile(blogPostPDFPath);
          res.send("Email sent!");
        } else {
          await deletePDFFile(blogPostPDFPath);
          next(createHttpError(400, "Please provide a valid email."));
        }
      } else {
        res.send(
          createHttpError(
            404,
            `Blog post with the id: ${blogPostId} not found.`
          )
        );
      }
    } catch (error) {
      next(error);
    }
  }
);

/* 
// =============== post Blog Post review =================
blogPostsRouter.post("/:blogPostId/reviews", async (req, res, next) => {
  try {
    const { blogPostId } = req.params;
    const updatedBlogPost = await BlogPostModel.findByIdAndUpdate(
      blogPostId,
      {
        $push: { reviews: req.body },
      },
      { new: true, runValidators: true }
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

// =============== Get all Blog Post reviews =================
blogPostsRouter.get("/:blogPostId/reviews", async (req, res, next) => {
  try {
    const { blogPostId } = req.params;
    const blogPost = await BlogPostModel.findById(blogPostId);
    if (blogPost) {
      res.send(blogPost.reviews);
    } else {
      next(createHttpError(404, `Blog Post with id: ${blogPostId} not found!`));
    }
  } catch (error) {
    next(error);
  }
});

// =============== Get single Blog Post review =================
blogPostsRouter.get(
  "/:blogPostId/reviews/:reviewId",
  async (req, res, next) => {
    try {
      const { blogPostId } = req.params;
      const blogPost = await BlogPostModel.findById(blogPostId);
      if (blogPost) {
        const { reviewId } = req.params;
        const review = blogPost.reviews.find(
          (r) => r._id.toString() === reviewId
        );
        if (review) {
          res.send(review);
        } else {
          next(createHttpError(404, `Review with id: ${reviewId} not found!`));
        }
      } else {
        next(
          createHttpError(404, `Blog Post with id: ${blogPostId} not found!`)
        );
      }
    } catch (error) {
      next(error);
    }
  }
);

// =============== Update Blog Post Review =================
blogPostsRouter.put(
  "/:blogPostId/reviews/:reviewId",
  async (req, res, next) => {
    try {
      const { blogPostId } = req.params;
      const { reviewId } = req.params;
      const blogPost = await BlogPostModel.findOneAndUpdate(
        {
          _id: blogPostId,
          "reviews._id": reviewId,
        },
        { $set: { "reviews.$": { _id: reviewId, ...req.body } } },
        { new: true, runValidators: true }
      );
      if (blogPost) {
        res.send(blogPost);
      } else {
        next(createHttpError(404, `Not found!`));
      }
    } catch (error) {
      next(error);
    }
  }
);

// =============== Delete Blog Post Review =================
blogPostsRouter.delete(
  "/:blogPostId/reviews/:reviewId",
  async (req, res, next) => {
    try {
      const { blogPostId } = req.params;
      const { reviewId } = req.params;
      const blogPost = await BlogPostModel.findByIdAndUpdate(
        blogPostId,
        {
          $pull: {
            reviews: { _id: reviewId },
          },
        },
        { new: true }
      );
      if (blogPost) {
        res.send(blogPost);
      } else {
        next(createHttpError(404, `Not found!`));
      }
    } catch (error) {
      next(error);
    }
  }
);

*/

export default blogPostsRouter; // export Routing
