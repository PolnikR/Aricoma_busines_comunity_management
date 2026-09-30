import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TruncatedText } from './TruncatedText'

describe('TruncatedText', () => {
  it('keeps the full accessible name and reveals it for focus, hover and touch', async () => {
    const name = 'PRODUCTION_DATABASE_VOLUME_000001'
    render(<TruncatedText text={name} />)
    const control = screen.getByRole('button', { name })
    expect(control).toHaveTextContent('PRODUCT…0001')
    fireEvent.focus(control)
    expect(control).toHaveTextContent(name)
    fireEvent.blur(control)
    fireEvent.mouseEnter(control)
    expect(control).toHaveTextContent(name)
    fireEvent.mouseLeave(control)
    await userEvent.setup().click(control)
    expect(control).toHaveTextContent(name)
  })
})
