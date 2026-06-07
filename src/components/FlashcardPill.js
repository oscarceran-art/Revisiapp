import React from 'react';

export default function FlashcardPill({ spacingAdjustment, onAdjust }) {
  return (
    <div style={{
      backgroundColor: '#e0e0e0',
      padding: '8px 16px',
      borderRadius: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: 'fit-content',
      margin: '0 auto'
    }}>
      <span>Spacing: {spacingAdjustment}</span>
      <div>
        <button onClick={() => onAdjust(1)}>+</button>
        <button onClick={() => onAdjust(-1)}>-</button>
      </div>
    </div>
  );
}