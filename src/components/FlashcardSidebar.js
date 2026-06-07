import React from 'react';

export default function FlashcardSidebar({ decks, onSelectDeck }) {
  return (
    <div style={{
      width: '250px',
      backgroundColor: '#f5f5f5',
      padding: '16px',
      borderRight: '1px solid #ccc'
    }}>
      <h3 style={{ marginBottom: '16px' }}>Decks</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {decks.map(deck => (
          <li key={deck.id}>
            <button
              onClick={() => onSelectDeck(deck.id)}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '4px',
                textAlign: 'left',
                marginBottom: '8px'
              }}
            >
              {deck.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}