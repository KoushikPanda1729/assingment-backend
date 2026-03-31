import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import config from './index'
import { UserRepository } from '../repositories/UserRepository'

const userRepo = new UserRepository()

passport.use(
  new GoogleStrategy(
    {
      clientID: config.googleClientId,
      clientSecret: config.googleClientSecret,
      callbackURL: config.googleCallbackUrl,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value ?? ''
        const avatar = profile.photos?.[0]?.value ?? ''

        const user = await userRepo.findOrCreateGoogleUser({
          googleId: profile.id,
          name: profile.displayName,
          email,
          avatar,
        })

        done(null, user)
      } catch (error) {
        done(error as Error, undefined)
      }
    }
  )
)

export default passport
