module Vec2 where

import Prelude
import Global (infinity)
import Data.Int (toNumber)
import Signal.DOM (CoordinatePair)

import Util (jiggle)

newtype Vec2 = Vec2 { x :: Number, y :: Number }

instance eqVec2 :: Eq Vec2 where
  eq (Vec2 v1) (Vec2 v2) = v1.x == v2.x && v1.y == v2.y

wrapCP :: CoordinatePair -> Vec2
wrapCP cp = Vec2 { x: toNumber cp.x, y: toNumber cp.y }

runVec2 :: Vec2 -> { x :: Number, y :: Number }
runVec2 (Vec2 v) = v

zeroV2 :: Vec2
zeroV2 = Vec2 { x: 0.0, y: 0.0 }

infV2 :: Vec2
infV2 = Vec2 { x: infinity, y: infinity }

jiggleV2 :: Vec2 -> Vec2
jiggleV2 (Vec2 v) = Vec2 { x: jiggle v.x, y: jiggle v.y }

normL2Sq :: Vec2 -> Number
normL2Sq (Vec2 v) = v.x * v.x + v.y * v.y

addV2 :: Vec2 -> Vec2 -> Vec2
addV2 (Vec2 a) (Vec2 b) = Vec2 { x: a.x + b.x, y: a.y + b.y }

subV2 :: Vec2 -> Vec2 -> Vec2
subV2 (Vec2 a) (Vec2 b) = Vec2 { x: a.x - b.x, y: a.y - b.y }

smulV2 :: Vec2 -> Number -> Vec2
smulV2 (Vec2 v) n = Vec2 { x: v.x * n, y: v.y * n }

sdivV2 :: Vec2 -> Number -> Vec2
sdivV2 (Vec2 v) n = Vec2 { x: v.x / n, y: v.y / n }

infixl 6 addV2 as :+:
infixl 6 subV2 as :-:
infixl 7 smulV2 as :*
infixl 7 sdivV2 as :/
