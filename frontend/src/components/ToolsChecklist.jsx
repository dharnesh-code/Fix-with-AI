import { useState } from "react";

export default function ToolsChecklist({ tools }) {
  const [checked, setChecked] = useState({});

  function toggle(item) {
    setChecked((prev) => ({ ...prev, [item]: !prev[item] }));
  }

  return (
    <ul className="tools-list">
      {tools.map((item) => (
        <li
          key={item}
          className={`tool-item ${checked[item] ? "checked" : ""}`}
          onClick={() => toggle(item)}
        >
          <input type="checkbox" checked={!!checked[item]} onChange={() => toggle(item)} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
