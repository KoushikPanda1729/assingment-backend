import type { Response } from 'express'
import { setAuthCookies, clearAuthCookies, getTokensFromCookies } from '../../utils/cookie'

function makeRes(): jest.Mocked<Response> {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as jest.Mocked<Response>
}

describe('cookie utils', () => {
  describe('setAuthCookies', () => {
    it('should set access and refresh token cookies', () => {
      const res = makeRes()

      setAuthCookies(res, 'access_token', 'refresh_token')

      expect(res.cookie).toHaveBeenCalledTimes(2)
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'access_token',
        expect.objectContaining({ httpOnly: true })
      )
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh_token',
        expect.objectContaining({ httpOnly: true })
      )
    })

    it('should set access token with 15 minute expiry', () => {
      const res = makeRes()

      setAuthCookies(res, 'access', 'refresh')

      const accessCall = jest.mocked(res.cookie).mock.calls[0]
      expect(accessCall?.[2]).toMatchObject({ maxAge: 15 * 60 * 1000 })
    })

    it('should set refresh token with 7 day expiry', () => {
      const res = makeRes()

      setAuthCookies(res, 'access', 'refresh')

      const refreshCall = jest.mocked(res.cookie).mock.calls[1]
      expect(refreshCall?.[2]).toMatchObject({ maxAge: 7 * 24 * 60 * 60 * 1000 })
    })
  })

  describe('clearAuthCookies', () => {
    it('should clear both cookies', () => {
      const res = makeRes()

      clearAuthCookies(res)

      expect(res.clearCookie).toHaveBeenCalledTimes(2)
      expect(res.clearCookie).toHaveBeenCalledWith('access_token', { path: '/' })
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', { path: '/' })
    })
  })

  describe('getTokensFromCookies', () => {
    it('should extract tokens from cookies', () => {
      const cookies = { access_token: 'my_access', refresh_token: 'my_refresh' }

      const result = getTokensFromCookies(cookies)

      expect(result.accessToken).toBe('my_access')
      expect(result.refreshToken).toBe('my_refresh')
    })

    it('should return undefined for missing tokens', () => {
      const result = getTokensFromCookies({})

      expect(result.accessToken).toBeUndefined()
      expect(result.refreshToken).toBeUndefined()
    })
  })
})
