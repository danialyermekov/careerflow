import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from '../context/AppContext'
import GuidedTour from './GuidedTour'

test('tour scrolls its heading below the actual wrapped navigation height', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView
  HTMLElement.prototype.scrollIntoView = jest.fn()
  const rect = jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    return { top: this.classList.contains('guidedTour') ? 40 : 0, bottom: this.tagName === 'NAV' ? 157 : 0 }
  })
  const scrollBy = jest.spyOn(window, 'scrollBy').mockImplementation(() => {})
  try {
    await act(async () => root.render(<><nav /><div data-tour-slot="recommendation" /><AppProvider><GuidedTour step={0} onStep={() => {}} onClose={() => {}} /></AppProvider></>))
    expect(host.querySelector('.guidedTour h2').textContent).toBeTruthy()
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
    expect(scrollBy).toHaveBeenCalledWith(0, 40 - 157 - 12)
  } finally {
    act(() => root.unmount())
    host.remove()
    rect.mockRestore()
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView
    scrollBy.mockRestore()
  }
})
