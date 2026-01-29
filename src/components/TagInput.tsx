import * as React from "react";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Add tag",
}: TagInputProps) {
  const [input, setInput] = React.useState("");
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filteredSuggestions = (suggestions || [])
    .filter((s): s is string => typeof s === "string")
    .filter(
      (s) =>
        s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s),
    );

  function addTag(tag: string) {
    if (!tag.trim() || value.includes(tag.trim())) return;
    onChange([...value, tag.trim()]);
    setInput("");
    setShowSuggestions(false);
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && input.trim()) {
      addTag(input);
      e.preventDefault();
    } else if (e.key === "Backspace" && !input && value.length) {
      removeTag(value[value.length - 1]);
    }
  }

  function handleSuggestionClick(s: string) {
    addTag(s);
    inputRef.current?.focus();
  }

  return (
    <div className="tag-input">
      <div className="tag-list">
        {value.map((tag) => (
          <span className="tag" key={tag}>
            {tag}
            <button
              type="button"
              className="tag-remove"
              onClick={() => removeTag(tag)}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={handleInputKeyDown}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
          placeholder={placeholder}
          className="tag-input-field"
        />
      </div>
      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul className="tag-suggestions">
          {filteredSuggestions.map((s) => (
            <li key={s} onMouseDown={() => handleSuggestionClick(s)}>
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
