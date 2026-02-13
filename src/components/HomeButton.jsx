import { useNavigate } from 'react-router-dom'

export default function HomeButton({ children, className }) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate('/')}
      className={className ? className + ' home-button' : 'home-button'}
      aria-label="Return to home"
    >
      {children || 'Home'}
    </button>
  )
}
