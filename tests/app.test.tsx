import React from 'react';
import App from '../pages';
import {render, screen} from '@testing-library/react'
import '@testing-library/jest-dom'

describe('App', () => {
    it('should render the app', () => {
        render(<App />);
        expect(screen.getByText('Turrero Post')).toBeInTheDocument();
        expect(screen.getByText('Top 25 turras')).toBeInTheDocument();
    });
})