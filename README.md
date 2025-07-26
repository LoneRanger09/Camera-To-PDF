# 📸 Camera to PDF Web App with Compression

This project is a **web-based application** that allows users to:

- Capture an image directly from their device's camera
- Convert the captured image into a PDF
- Input a **target size range** (min and max in KB)
- Compress the PDF dynamically to fit within the specified size
- Download the final compressed PDF

No server-side processing is required — everything runs **100% in-browser** using HTML5 and JavaScript.

---

## 🚀 Live Demo

Coming soon...

---

## ✨ Features

- ✅ Open device camera using `getUserMedia()`
- ✅ Capture and preview the current camera frame
- ✅ Input **minimum and maximum file size** for the output PDF
- ✅ Real-time **image compression** before embedding in PDF
- ✅ PDF generation using [`pdf-lib`](https://pdf-lib.js.org/)
- ✅ Automatic size-check loop to match desired file size
- ✅ Download button for final PDF

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| HTML5      | Markup structure |
| CSS3       | Basic styling |
| JavaScript | App logic |
| MediaDevices API (`getUserMedia`) | Access device camera |
| Canvas API | Capture frame as image |
| [pdf-lib](https://pdf-lib.js.org/) | Generate and manipulate PDF in-browser |
| [browser-image-compression](https://www.npmjs.com/package/browser-image-compression) *(optional)* | Efficient image compression |

---

## 🧑‍💻 Installation & Usage

1. **Clone the Repository**

```bash
git clone https://github.com/your-username/camera-to-pdf-app.git
cd camera-to-pdf-app
```

---

Let me know if you’d like this customized with your GitHub repo link, author name, or want the full `index.html` file next.
