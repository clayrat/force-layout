module Graph where

import Prelude (($))
import Data.Int (toNumber)
import Data.Array (length)

type Id = Int
data Link l = Link Id Id l
type Graph n l = { numNodes :: Number, nodes :: Array n, links :: Array (Link l) }

mkGraph :: forall n l. Array n -> Array (Link l) -> Graph n l
mkGraph nodes links = { numNodes : toNumber $ length nodes, nodes : nodes, links : links }
