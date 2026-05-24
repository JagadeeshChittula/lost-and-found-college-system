import { useState } from "react";
import { api } from "../api/client.js";

export default function ItemForm({ type }) {
  const isLost = type === "lost";
  const [status, setStatus] = useState("");
  const [fileName, setFileName] = useState("No file chosen");

  async function submitItem(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.append("type", type);
    const res = await api.post("/api/items", formData, true);
    if (res.ok) {
      const linkNote = res.imageUrl ? ` Photo saved to Cloudinary.` : "";
      setStatus(`${type} item submitted.${linkNote}`);
      setFileName("No file chosen");
      form.reset();
    } else {
      setStatus(res.message || res.error || "Please login to submit.");
    }
  }

  return (
    <section className="form-card">
      <h2>{isLost ? "Report a Lost Item" : "Report a Found Item"}</h2>
      <p>{isLost ? "Fill in the details below. The admin can help moderate spam and guide recoveries." : "Help someone get their item back by submitting the details."}</p>
      <form className="form" encType="multipart/form-data" onSubmit={submitItem}>
        <div className="grid">
          <label>
            {isLost ? "Item Name" : "Found Item Name"}
            <input type="text" name="name" required />
          </label>
          <label>
            Contact Person
            <input type="text" name="contact" required />
          </label>
          <label>
            Email
            <input type="email" name="email" />
          </label>
          <label>
            {isLost ? "Date Lost" : "Date Found"}
            <input type="date" name="item_date" required />
          </label>
          <label>
            Description
            <input type="text" name="description" placeholder={isLost ? "Color, location, time" : "Where found, color"} />
          </label>
          <label>Upload Photo</label>
          <div className="file-field">
            <input
              id={`${type}Photo`}
              className="file-input"
              type="file"
              name="image"
              accept="image/*"
              onChange={(event) => setFileName(event.target.files?.[0]?.name || "No file chosen")}
            />
            <label className="file-button" htmlFor={`${type}Photo`}>
              Choose File
            </label>
            <span className="file-name">{fileName}</span>
          </div>
        </div>
        <button className="btn" type="submit">
          Submit {isLost ? "Lost" : "Found"} Item
        </button>
        <div className="form-status">{status}</div>
      </form>
    </section>
  );
}
