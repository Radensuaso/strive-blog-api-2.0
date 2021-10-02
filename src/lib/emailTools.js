import sgMail from "@sendgrid/mail";
import pkg from "fs-extra";

const { readFile } = pkg;

export const readPDFFile = async (path) => await readFile(path);

sgMail.setApiKey(process.env.SEND_GRID_API_KEY);

export const sendEmail = async (blogPost, pdf, email, author) => {
  const attachment = await (await readPDFFile(pdf)).toString("base64");
  const msg = {
    to: email,
    from: "andrels9283@gmail.com",
    subject: "The blog Post you created",
    html: `<p>Hello <strong>${author.name}!</strong></p><p>Here is your <strong>Blog Post!</strong></p><p>Please see it attached</p><p>Best Regards. <br/> Strive School.</p>`,
    attachments: [
      {
        content: attachment,
        filename: "Blog post.pdf",
        type: "application/pdf",
        disposition: "attachment",
      },
    ],
  };

  await sgMail.send(msg);
};
