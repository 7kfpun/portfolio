import styled from 'styled-components';

export const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 1rem;

  @media (min-width: 768px) {
    padding: 0;
  }
`;

export const Header = styled.div`
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    margin-bottom: 1.5rem;
  }
`;

export const Meta = styled.p`
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.3em;
  color: #64748b;
  margin-bottom: 0.5rem;

  @media (max-width: 768px) {
    font-size: 0.7rem;
    letter-spacing: 0.2em;
  }
`;

export const Title = styled.h1`
  margin: 0 0 0.5rem 0;
  font-size: clamp(1.75rem, 4vw, 3rem);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

export const Description = styled.p`
  color: #475569;
  margin: 0;
  font-size: clamp(0.95rem, 2vw, 1.1rem);
  line-height: 1.5;
`;

export const Card = styled.div`
  border-radius: 16px;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(24px);

  @media (max-width: 768px) {
    padding: 1.25rem;
    border-radius: 12px;
  }
`;

export const LoadingText = styled.p`
  text-align: center;
  color: #64748b;
  font-size: 1.1rem;
  padding: 3rem;

  @media (max-width: 768px) {
    font-size: 1rem;
    padding: 2rem 1rem;
  }
`;

export const ErrorText = styled.p`
  text-align: center;
  color: #dc2626;
  font-size: 1.1rem;
  padding: 3rem;
  background: #fee2e2;
  border-radius: 12px;

  @media (max-width: 768px) {
    font-size: 1rem;
    padding: 2rem 1rem;
  }
`;
