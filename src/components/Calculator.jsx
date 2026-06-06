import { useState } from 'react';

function Calculator({ setCalculatorMode, anonymousMode }) {
  const [display, setDisplay] = useState('0');

  const handleButtonClick = (value) => {
    if (value === 'C') {
      setDisplay('0');
      return;
    }

    if (value === 'DEL') {
      if (display.length <= 1 || display === 'Error') {
        setDisplay('0');
      } else {
        setDisplay(display.slice(0, -1));
      }
      return;
    }

    if (value === '=') {
      // Exit check: type "00" or "000" then press equals to return to NOVI
      if (display === '00' || display === '000' || (/^0+$/.test(display) && display.length >= 2)) {
        setCalculatorMode(false);
        return;
      }

      // Calculate logic
      let expression = display;
      // Replace visual operators with math symbols
      expression = expression.replace(/x/g, '*').replace(/\u00f7/g, '/');
      // Format percentage e.g. "50%" -> "(50/100)"
      expression = expression.replace(/(\d+(\.\d+)?)%/g, '($1/100)');

      try {
        const evalFn = new Function(`return (${expression})`);
        const result = evalFn();
        if (result === undefined || isNaN(result) || !isFinite(result)) {
          setDisplay('Error');
        } else {
          // Limit decimals and convert back to string
          const formatted = Number(result.toFixed(8)).toString();
          setDisplay(formatted);
        }
      } catch (err) {
        setDisplay('Error');
      }
      return;
    }

    // Handle appending characters
    if (display === '0' || display === 'Error') {
      if (['+', '-', 'x', '\u00f7', '%'].includes(value)) {
        // Allow operator after 0
        setDisplay('0' + value);
      } else if (value === '.') {
        setDisplay('0.');
      } else if (value === '0') {
        setDisplay('00');
      } else {
        setDisplay(value);
      }
    } else {
      // Prevent consecutive operators
      const lastChar = display.slice(-1);
      const isOperator = ['+', '-', 'x', '\u00f7', '%'].includes(value);
      const isLastCharOperator = ['+', '-', 'x', '\u00f7', '%'].includes(lastChar);

      if (isOperator && isLastCharOperator) {
        // Replace last operator with new one
        setDisplay(display.slice(0, -1) + value);
      } else {
        setDisplay(display + value);
      }
    }
  };

  return (
    <div className="calculator-overlay" role="application" aria-label="Calculator">
      <div className="calc-display-section">
        <div className="calc-display-text" role="status" aria-label={`Calculator display: ${display}`}>{display}</div>
      </div>
      <div className="calc-keypad-section">
        {/* Row 1 */}
        <button className="calc-btn util-btn" onClick={() => handleButtonClick('C')} aria-label="Clear">C</button>
        <button className="calc-btn util-btn" onClick={() => handleButtonClick('DEL')} aria-label="Delete last character">
          <i className="fa-solid fa-delete-left" aria-hidden="true"></i>
        </button>
        <button className="calc-btn util-btn" onClick={() => handleButtonClick('%')} aria-label="Percent">%</button>
        <button className="calc-btn operator-btn" onClick={() => handleButtonClick('\u00f7')} aria-label="Divide">{'\u00f7'}</button>

        {/* Row 2 */}
        <button className="calc-btn num-btn" onClick={() => handleButtonClick('7')} aria-label="7">7</button>
        <button className="calc-btn num-btn" onClick={() => handleButtonClick('8')} aria-label="8">8</button>
        <button className="calc-btn num-btn" onClick={() => handleButtonClick('9')} aria-label="9">9</button>
        <button className="calc-btn operator-btn" onClick={() => handleButtonClick('x')} aria-label="Multiply">x</button>

        {/* Row 3 */}
        <button className="calc-btn num-btn" onClick={() => handleButtonClick('4')} aria-label="4">4</button>
        <button className="calc-btn num-btn" onClick={() => handleButtonClick('5')} aria-label="5">5</button>
        <button className="calc-btn num-btn" onClick={() => handleButtonClick('6')} aria-label="6">6</button>
        <button className="calc-btn operator-btn" onClick={() => handleButtonClick('-')} aria-label="Subtract">-</button>

        {/* Row 4 */}
        <button className="calc-btn num-btn" onClick={() => handleButtonClick('1')} aria-label="1">1</button>
        <button className="calc-btn num-btn" onClick={() => handleButtonClick('2')} aria-label="2">2</button>
        <button className="calc-btn num-btn" onClick={() => handleButtonClick('3')} aria-label="3">3</button>
        <button className="calc-btn operator-btn" onClick={() => handleButtonClick('+')} aria-label="Add">+</button>

        {/* Row 5 */}
        <button className="calc-btn num-btn double-width" onClick={() => handleButtonClick('0')} aria-label="0">0</button>
        <button className="calc-btn num-btn" onClick={() => handleButtonClick('.')} aria-label="Decimal point">.</button>
        <button className="calc-btn equals-btn" onClick={() => handleButtonClick('=')} aria-label="Equals">=</button>
      </div>
    </div>
  );
}

export default Calculator;
