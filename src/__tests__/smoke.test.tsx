import { render, screen } from '@testing-library/react';
import React from 'react';

describe('Smoke test', () => {
  it('renders a simple element', () => {
    render(<div>Hello, AuthorMagic!</div>);
    expect(screen.getByText('Hello, AuthorMagic!')).toBeInTheDocument();
  });
});
