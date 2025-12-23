const sanitize = require("sanitize-html");

const defaultOpts = {
   allowedTags: ["b", "i", "em", "strong", "ul", "ol", "li"],
   allowedAttributes: {},
};

const htmlSanitize = function (html, options = {}) {
   const finalOptions = { ...defaultOpts, ...options };
   const content = html || null;
   return sanitize(content, finalOptions);
};

module.exports = { htmlSanitize };
