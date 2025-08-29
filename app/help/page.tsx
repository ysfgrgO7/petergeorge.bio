"use client";

import { IoLogoWhatsapp } from "react-icons/io";

export default function Home() {
  return (
    <div className="wrapper">
      <h1>Get Help</h1>

      <a
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "var(--green)",
          color: "var(--white)",
          padding: "10px 20px",
          borderRadius: "5px",
          textDecoration: "none",
          textAlign: "center",
          justifyContent: "center",
          margin: "2rem",
        }}
        href="https://wa.me/201005679461"
      >
        <IoLogoWhatsapp style={{ marginRight: "5px" }} />
        <strong>To get help, Click for Support</strong>
      </a>
      <h2>Support Videos</h2>

      <h3>How to Register/Login?</h3>
      <iframe
        width="100%"
        height="400px"
        src="https://www.youtube.com/embed/1Vl6Gx7S08Y"
        title="Registeration"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      ></iframe>

      <h3>How to purchase a lecture?</h3>
      <iframe
        width="100%"
        height="400px"
        src="https://www.youtube.com/embed/wajyZ0vdwrg"
        title="How to purchase a lecture?"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      ></iframe>
    </div>
  );
}
