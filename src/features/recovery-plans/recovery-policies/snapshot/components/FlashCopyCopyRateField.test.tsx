import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { FlashCopyCopyRateField } from './FlashCopyCopyRateField'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

it('resets the thumb, number, track fill and selected preset together when the form value resets', () => {
  const props = { error: undefined, disabled: false, onChange: vi.fn(), onKeyDown: vi.fn() }
  const { rerender } = render(<FlashCopyCopyRateField {...props} value="150" />)
  const slider = screen.getByRole('slider', { name: 'FlashCopy copy rate slider' })
  expect(slider.style.getPropertyValue('--copy-rate-progress')).toBe('100%')
  expect(screen.getByRole('button', { name: '150' })).toHaveAttribute('aria-pressed', 'true')

  rerender(<FlashCopyCopyRateField {...props} value="50" />)
  expect(slider).toHaveValue('50')
  expect(screen.getByRole('spinbutton', { name: 'FlashCopy copy rate' })).toHaveValue(50)
  expect(slider.style.getPropertyValue('--copy-rate-progress')).toBe(`${String(50 / 150 * 100)}%`)
  expect(screen.getByRole('button', { name: '50' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: '150' })).toHaveAttribute('aria-pressed', 'false')

  rerender(<FlashCopyCopyRateField {...props} value="0" />)
  expect(slider).toHaveValue('0')
  expect(slider.style.getPropertyValue('--copy-rate-progress')).toBe('0%')
  expect(screen.getByRole('spinbutton', { name: 'FlashCopy copy rate' })).toHaveValue(0)
  expect(screen.getByRole('button', { name: '0' })).toHaveAttribute('aria-pressed', 'true')
})
