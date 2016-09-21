module BarnesHut where

import Prelude

import Data.Foldable (foldl)
import Data.List (List(..), (:))

import Vec2 (Vec2(..), runVec2, (:+:), (:/), zeroV2, infV2)

data QuadTree a = Leaf a | Node a Number (QuadTree a)
                                         (QuadTree a)
                                         (QuadTree a)
                                         (QuadTree a)

ex :: forall a. QuadTree a -> a
ex (Leaf a) = a
ex (Node a _ _ _ _ _) = a

type Stop a = { stop :: Boolean, value :: a }

foldBreak :: forall a r. (a -> r -> r)                    -- fold with leaf
                      -> (Number -> a -> r -> Stop r)     -- fold with node
                      -> QuadTree a -> r -> r
foldBreak fl fn qt = go qt
  where
  go (Leaf a) r = fl a r
  go (Node a w ul ur dl dr) r =
    if fres.stop then fres.value
    else go ul >>> go ur >>> go dl >>> go dr $ fres.value
    where
      fres = fn w a r

type HasCoords r = { coords :: Vec2 | r }

qPart :: forall r. List (HasCoords r) -> Vec2 -> { ul :: List (HasCoords r)
                                                 , ur :: List (HasCoords r)
                                                 , dl :: List (HasCoords r)
                                                 , dr :: List (HasCoords r)
                                                 }
qPart Nil _ = { ul: Nil, ur: Nil, dl: Nil, dr: Nil }
qPart (Cons hv@{coords : (Vec2 hd)} tl) vec@(Vec2 v)
  | hd.x <  v.x && hd.y <  v.y = case qPart tl vec of q -> q { ul = Cons hv q.ul }
  | hd.x >= v.x && hd.y <  v.y = case qPart tl vec of q -> q { ur = Cons hv q.ur }
  | hd.x <  v.x && hd.y >= v.y = case qPart tl vec of q -> q { dl = Cons hv q.dl }
  | otherwise                  = case qPart tl vec of q -> q { dr = Cons hv q.dr }

cover :: forall r. List (HasCoords r) -> { v0 :: Vec2, v1 :: Vec2 }
cover Nil = { v0: zeroV2, v1: zeroV2 }
cover l = foldl (\{ v0: Vec2 v0, v1: Vec2 v1 } { coords : (Vec2 v) } ->
                { v0: Vec2 { x: min v.x v0.x, y: min v.y v0.y }
                , v1: Vec2 { x: max v.x v1.x, y: max v.y v1.y }
                }
              ) { v0: infV2, v1: zeroV2 } l

coincident :: forall r. List (HasCoords r) -> Boolean
coincident Nil = true
coincident (Cons v Nil) = true
coincident (Cons v1 v2s@(Cons v2 _)) | v1.coords == v2.coords = coincident v2s
                                     | otherwise = false

populateWith :: forall a r. (List (HasCoords r) -> a)     -- how to make leaves
                         -> (a -> a -> a -> a -> a)       -- how to make nodes
                         -> List (HasCoords r)
                         -> QuadTree a
populateWith fl _ Nil = Leaf $ fl Nil
populateWith fl fn l = go l cov.v0 cov.v1
  where
    cov = cover l
    go l v0@(Vec2 rv0) v1@(Vec2 rv1) | coincident l = Leaf $ fl l
                                     | otherwise = Node (fn (ex ful) (ex fur) (ex fdl) (ex fdr)) (rv1.x-rv0.x) ful fur fdl fdr
      where
        ful = go parts.ul v0   vm
        fur = go parts.ur vur0 vur1
        fdl = go parts.dl vdl0 vdl1
        fdr = go parts.dr vm   v1
        parts = qPart l vm
        vm = (v0 :+: v1) :/ 2.0
        rvm = runVec2 vm
        vur0 = Vec2 {x: rvm.x, y: rv0.y}
        vdl1 = Vec2 {x: rvm.x, y: rv1.y}
        vdl0 = Vec2 {x: rv0.x, y: rvm.y}
        vur1 = Vec2 {x: rv1.x, y: rvm.y}
