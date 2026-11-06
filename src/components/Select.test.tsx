import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Select } from './Select';

const options = [
  { value: 1, label: '1 person' },
  { value: 5, label: 'Up to 5' },
  { value: 10, label: 'Up to 10' },
];

function Harness({ onChange }: { onChange: (v: number) => void }) {
  const [value, setValue] = useState(1);
  return (
    <Select
      label="Uses"
      value={value}
      options={options}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

describe('Select', () => {
  it('shows the current option and opens a listbox', () => {
    render(<Harness onChange={() => undefined} />);
    const trigger = screen.getByRole('button', { name: 'Uses' });
    expect(trigger).toHaveTextContent('1 person');
    fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('chooses an option with a click', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Uses' }));
    fireEvent.click(screen.getByRole('option', { name: 'Up to 10' }));
    expect(onChange).toHaveBeenCalledWith(10);
    expect(screen.getByRole('button', { name: 'Uses' })).toHaveTextContent('Up to 10');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('chooses an option with the keyboard', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Uses' }), { key: 'ArrowDown' });
    const list = screen.getByRole('listbox');
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    fireEvent.keyDown(list, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('closes on Escape without changing the value', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Uses' }));
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
