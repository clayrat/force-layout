module Util where

import Prelude
import Global.Unsafe (unsafeToFixed)
import Partial.Unsafe (unsafePartial)
import Control.Monad.Eff.Unsafe (unsafePerformEff)
import Control.Monad.Eff.Random (random)
import Data.Maybe (fromJust)

jiggle :: Number -> Number
jiggle i = if i /= 0.0 then i else (unsafePerformEff random - 0.5) * 1e-6

jiggleD :: Number -> Number
jiggleD i = i + unsafePerformEff random * 20.0 - 10.0

format :: Number -> String
format = unsafeToFixed 13
