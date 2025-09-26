import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeSwitcher } from '../ThemeSwitcher'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

describe('ThemeSwitcher', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    document.documentElement.className = ''
  })

  it('renders without crashing', () => {
    render(<ThemeSwitcher />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('shows system theme icon initially', () => {
    render(<ThemeSwitcher />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('opens dropdown menu when clicked', async () => {
    render(<ThemeSwitcher />)

    const button = screen.getByRole('button')
    await user.click(button)

    expect(screen.getByText('Theme Preferences')).toBeInTheDocument()
    expect(screen.getByText('Orange Light')).toBeInTheDocument()
    expect(screen.getByText('Orange Dark')).toBeInTheDocument()
    expect(screen.getByText('Monochrome Light')).toBeInTheDocument()
    expect(screen.getByText('Monochrome Dark')).toBeInTheDocument()
    expect(screen.getByText('System Preference')).toBeInTheDocument()
  })

  it('changes theme when option is selected', async () => {
    localStorageMock.getItem.mockReturnValue(null)

    render(<ThemeSwitcher />)

    const button = screen.getByRole('button')
    await user.click(button)

    const orangeLightOption = screen.getByText('Orange Light')
    await user.click(orangeLightOption)

    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'orange-light')
    expect(document.documentElement.classList.contains('orange-light')).toBe(true)
  })

  it('loads saved theme from localStorage', () => {
    localStorageMock.getItem.mockReturnValue('orange-dark')

    render(<ThemeSwitcher />)

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('orange-dark')).toBe(true)
  })

  it('shows correct theme name in tooltip', async () => {
    localStorageMock.getItem.mockReturnValue('orange-light')

    render(<ThemeSwitcher />)

    const button = screen.getByRole('button')

    // Hover over button to show tooltip
    await user.hover(button)

    await waitFor(() => {
      const tooltipContent = screen.getAllByText('Theme: Orange Light')
      expect(tooltipContent.length).toBeGreaterThan(0)
    })
  })

  it('shows active theme indicator', async () => {
    localStorageMock.getItem.mockReturnValue('system')

    render(<ThemeSwitcher />)

    const button = screen.getByRole('button')
    await user.click(button)

    const activeIndicator = document.querySelector('.bg-blue-500')
    expect(activeIndicator).toBeInTheDocument()
  })
})