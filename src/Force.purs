module Force where

import Prelude
import Global (infinity)
import Math (sqrt, pow)
import Partial.Unsafe (unsafePartial)

import Data.Foldable (foldl, foldr)
import Data.Int (toNumber)
import Data.List (List(..), (:), mapWithIndex)
import Data.Array as A
import Data.Array.Partial as A
import Data.Map as M
import Data.Maybe (Maybe(..), fromMaybe, fromJust)
import Data.Tuple.Nested ((/\))

import Vec2 (Vec2(..), zeroV2, (:+:), (:-:), (:*), (:/), jiggleV2, normL2Sq)
import Graph (Graph, Id, Link(..))
import BarnesHut as BH
import Util (jiggleD)

data Force = Center Vec2
           | Links
           | ManyBody { distanceMin :: Number, distanceMax :: Number, theta2 :: Number }

type DrawNode a = { coords :: Vec2
                  , velocity :: Vec2
                  , count :: Int
                  , strength :: Number
                  , payload :: a
                  }

type DrawGraph a = Graph (DrawNode a)
                         { bias :: Number, strength :: Number, distance :: Number }

mkDrawGraph :: forall a l. Vec2 -> Graph a l -> DrawGraph a
mkDrawGraph (Vec2 c) g  = {
    numNodes: g.numNodes
  , nodes: g.nodes # A.mapWithIndex \i n -> { coords: Vec2 { x: jiggleD c.x
                                                         , y: jiggleD c.y
                                                         }
                                          , velocity: Vec2 {x: 0.0, y: 0.0}
                                          , count: getCount i
                                          , strength: -30.0
                                          , payload: n
                                          }
  , links: g.links <#> \(Link from to _) -> let
      fcnt = toNumber $ getCount from
      tcnt = toNumber $ getCount to
    in Link from to { bias : fcnt / (fcnt + tcnt)
                    , strength : 1.0 / min fcnt tcnt
                    , distance : 30.0
                    }
  }
  where
    getCount i = fromMaybe 0 (M.lookup i countMap)
    countMap = foldr (\(Link from to _) -> (M.alter bump from) >>> (M.alter bump to)) M.empty g.links
    bump Nothing = Just 1
    bump (Just k) = Just $ k+1

type BHNode a = { pos :: Vec2, strength :: Number, payloads :: List a }

force :: forall a. Number -> Force -> DrawGraph a -> DrawGraph a
force _ (Center c) g = g { nodes = g.nodes <#> \n -> n { coords = n.coords :-: s1 } }
  where
    sumCoords = foldl (\v n -> v :+: n.coords) zeroV2 g.nodes
    s1 = sumCoords :/ g.numNodes :-: c

force alpha Links g = g { nodes = foldl updateFromLink g.nodes g.links }
  where
    updateFromLink m (Link from to p) = unsafePartial $ ((A.modifyAt from $ bumpVelo vf2) >>> fromJust >>> (A.modifyAt to $ bumpVelo vt2) >>> fromJust) m
      where
      nf = unsafePartial $ A.unsafeIndex m from
      nt = unsafePartial $ A.unsafeIndex m to
      v1 = jiggleV2 $ nt.coords :+: nt.velocity :-: (nf.coords :+: nf.velocity)
      l1 = sqrt $ normL2Sq v1
      l2 = (l1 - p.distance) / l1 * alpha * p.strength
      v2 = v1 :* l2
      vt2 = nt.velocity :-: v2 :* p.bias
      vf2 = nf.velocity :+: v2 :* (1.0 - p.bias)
      bumpVelo v r = r {velocity = v}

force alpha (ManyBody p) g = g { nodes = g.nodes #
    A.mapWithIndex \i -> BH.foldBreak (simleaf i) simnode qt
  }
  where
    qt = BH.populateWith leaf node (A.toUnfoldable g.nodes # mapWithIndex (\n i -> n { payload = i }))    -- store id in payload
    leaf Nil = { pos : zeroV2
               , strength : 0.0
               , payloads : Nil :: List (DrawNode Id)
               }
    leaf l@(Cons hd tl) = { pos : hd.coords
                          , strength : foldl (\s n -> s + n.strength) 0.0 l
                          , payloads : l
                          }
    node ul ur dl dr = { pos : sumpos :/ s
                       , strength : s
                       , payloads : Nil :: List (DrawNode Id)
                       }
      where
        s = ul.strength + ur.strength + dl.strength + dr.strength
        sumpos = ul.pos :* ul.strength :+: ur.pos :* ur.strength :+:
                 dl.pos :* dl.strength :+: dr.pos :* dr.strength
    simleaf i n a =
      if l >= p.distanceMax then a
      else foldl (\a n -> if i == n.payload then a
          else a { velocity = a.velocity :+: pos :* (n.strength * alpha / l2) }
        ) a n.payloads
      where
        pos = jiggleV2 $ n.pos :-: a.coords
        l = normL2Sq pos
        l2 = if l < p.distanceMin then sqrt $ p.distanceMin * l else l
    simnode w n a =
      if w * w / p.theta2 < l then
        if l < p.distanceMax then
          { stop : true
          , value : a { velocity = a.velocity :+: pos :* (n.strength * alpha / l2) }
          }
        else { stop : true, value : a }
      else { stop : false, value : a }
      where
        pos = jiggleV2 $ n.pos :-: a.coords
        l = normL2Sq pos
        l2 = if l < p.distanceMin then sqrt $ p.distanceMin * l else l

type RenderGraph a = { graph :: DrawGraph a
                     , forces :: List Force
                     , alpha :: Number
                     , alphaMin :: Number
                     , alphaDecay :: Number
                     , alphaTarget :: Number
                     , velocityDecay :: Number
                     , status :: String
                     }

mkRenderGraph :: forall a l. Vec2 -> Number -> Graph a l -> RenderGraph a
mkRenderGraph center alphaMin graph = {
          graph: mkDrawGraph center graph
        , forces: Links :
                  ManyBody { distanceMin : 1.0, distanceMax : infinity, theta2 : 0.81 } :
                  Center center :
                  Nil
        , alpha: 1.0
        , alphaMin : alphaMin
        , alphaDecay: 1.0 - pow alphaMin (1.0/300.0)
        , alphaTarget: 0.0
        , velocityDecay: 0.6
        , status: "TEST"
        }

evolveForces :: forall a. RenderGraph a -> RenderGraph a
evolveForces rg = if rg.alpha < rg.alphaMin then rg
  else rg { graph = (applyForces >>> applyVelocities) rg.graph
          , alpha = rg.alpha + (rg.alphaTarget - rg.alpha) * rg.alphaDecay
          }
  where
  applyForces = foldl (>>>) id (rg.forces <#> force rg.alpha)
  applyVelocities g = g { nodes = g.nodes <#> \n ->
    n { coords = n.coords :+: n.velocity
      , velocity = n.velocity :* rg.velocityDecay
      }
   }
