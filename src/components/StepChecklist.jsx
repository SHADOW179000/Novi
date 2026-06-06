import { useState } from 'react';

function StepChecklist({ steps }) {
  const [checked, setChecked] = useState(() => steps.map(() => false));

  const toggle = (index) => {
    setChecked((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const completedCount = checked.filter(Boolean).length;
  const total = steps.length;
  const pct = total === 0 ? 0 : Math.round((completedCount / total) * 100);
  const allDone = completedCount === total && total > 0;

  const barColor =
    pct <= 33 ? 'var(--red)' :
    pct <= 66 ? '#FFA500' :
    'var(--success)';

  return (
    <div className="step-checklist-wrapper">
      {/* Progress bar header */}
      <div className="checklist-progress-header">
        <span className="progress-label">
          {allDone
            ? 'All steps completed. Stay safe.'
            : `${completedCount} of ${total} steps completed`}
        </span>
        <span className="progress-pct" style={{ color: barColor }}>{pct}%</span>
      </div>

      <div className="checklist-progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Step completion progress">
        <div
          className="checklist-progress-fill"
          style={{
            width: `${pct}%`,
            backgroundColor: barColor,
          }}
        />
      </div>

      {/* Step items */}
      <ul className="checklist-items" aria-label="Action steps checklist">
        {steps.map((step, i) => (
          <li
            key={i}
            className={`checklist-item ${checked[i] ? 'done' : ''}`}
            onClick={() => toggle(i)}
            role="checkbox"
            aria-checked={checked[i]}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(i); } }}
          >
            <span className="checklist-circle" aria-hidden="true">
              {checked[i] && <i className="fa-solid fa-check checklist-checkmark" aria-hidden="true"></i>}
            </span>
            <span className={`checklist-text ${checked[i] ? 'strikethrough' : ''}`}>
              {step}
            </span>
          </li>
        ))}
      </ul>

      {allDone && (
        <div className="checklist-done-banner" role="status">
          <i className="fa-solid fa-shield-halved" aria-hidden="true"></i> All steps completed. Stay safe.
        </div>
      )}
    </div>
  );
}

export default StepChecklist;
