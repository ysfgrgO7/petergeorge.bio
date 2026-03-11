"use client";

import { IoLogoWhatsapp } from "react-icons/io";
import style from "./help.module.css";

export default function Home() {
  return (
    <div className="wrapper">
      <div className={style.card}>
        <h1>Get Help</h1>

        <button
          onClick={() => window.open("https://wa.me/201005679461", "_blank")}
          className={style.supportButton}
        >
          <IoLogoWhatsapp />
          To get help, Click for support
        </button>
      </div>

      <div className={style.card}>
        <h1>Support Videos</h1>
        <br />
        <h2>How to Register/Login?</h2>

        <div onContextMenu={(e) => e.preventDefault()}>
          <iframe
            width="100%"
            height="400px"
            src="https://www.youtube.com/embed/1Vl6Gx7S08Y?rel=0&modestbranding=1&controls=1"
            title="Registeration"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            style={{ borderRadius: "5px" }}
          ></iframe>
        </div>
        <br />
        <hr />

        <h2>How to purchase a lecture?</h2>
        <div onContextMenu={(e) => e.preventDefault()}>
          <iframe
            width="100%"
            height="400px"
            src="https://www.youtube.com/embed/wajyZ0vdwrg?rel=0&modestbranding=1&controls=1"
            title="How to purchase a lecture?"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            style={{ borderRadius: "5px" }}
          ></iframe>
        </div>
      </div>
    </div>
  );
}
