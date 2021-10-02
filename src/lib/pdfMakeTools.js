import PdfPrinter from "pdfmake";
import ImageDataURI from "image-data-uri";
import { promisify } from "util";
import { pipeline } from "stream";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pkg from "fs-extra";

const { createWriteStream, remove } = pkg;

// ============= Path to keep the pdf for moments
export const blogPostsPdfPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../public/blogPosts/pdf"
);

// ==================== Tools to write and read pdf
export const writePDFStream = (path) => createWriteStream(path);
export const deletePDFFile = (path) => remove(path);

//============= turnToBase64Format
const turnToBase64Format = async (url) => {
  const urlBase64 = await ImageDataURI.encodeFromURL(url);
  return urlBase64;
};

// ============== fonts to use in pdf  options
const fonts = {
  Roboto: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
};

//=================== get pd readableStream
export const getBlogPostPDFReadableStream = async (blogPost) => {
  const printer = new PdfPrinter(fonts);
  const base64Image = await turnToBase64Format(blogPost.cover);

  const docDefinition = {
    content: [
      { image: base64Image, width: 510 },
      "\n\n\n",
      {
        text: blogPost.title,
        style: "header",
      },
      "\n\n\n",
      blogPost.content,
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
      },
    },
  };
  const pdfReadableStream = printer.createPdfKitDocument(docDefinition);

  pdfReadableStream.end();
  return pdfReadableStream;
};

//=================== generate blog post PDF sync

export const generateBlogPostPDFAsync = async (blogPost) => {
  const asyncPipeline = promisify(pipeline);
  const printer = new PdfPrinter(fonts);
  const base64Image = await turnToBase64Format(blogPost.cover);

  const docDefinition = {
    content: [
      { image: base64Image, width: 510 },
      "\n\n\n",
      {
        text: blogPost.title,
        style: "header",
      },
      "\n\n\n",
      blogPost.content,
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
      },
    },
  };

  const pdfReadableStream = printer.createPdfKitDocument(docDefinition);

  pdfReadableStream.end();

  const blogPath = join(blogPostsPdfPath, `${blogPost.title}.pdf`);
  await asyncPipeline(pdfReadableStream, writePDFStream(blogPath));
  return blogPath;
};
