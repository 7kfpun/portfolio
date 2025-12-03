import styled from 'styled-components';

export const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 0.75rem;
  padding: 0.65rem 1.5rem;
  font-weight: 600;
  background: linear-gradient(135deg, #6d28d9, #a855f7);
  color: white;
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 20px rgba(168, 85, 247, 0.45);
  }

  &:focus-visible {
    outline: 2px solid rgba(168, 85, 247, 0.6);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
