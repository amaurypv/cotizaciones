import React from 'react';
import Header from './components/Header';
import QuoteForm from './components/QuoteForm';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-12 py-16 max-w-6xl">
        <QuoteForm />
      </main>
    </div>
  );
}

export default App;