module Main where

import Prelude
import Partial.Unsafe (unsafePartial)

import Data.Foldable (fold)
import Data.Array as A
import Data.Array.Partial as A
import Data.Monoid (mempty)
import Data.Tuple.Nested ((/\))

import Control.Monad.Eff (Eff)
import Signal.Channel (CHANNEL, Channel, send)

import Web.Markup (Markup, text)
import Web.Markup.HTML.Event as E
import Web.Markup.HTML.Attributes (class_)
import Web.Markup.Event (on_)
import Web.Markup.SVG (svg, g, circle, line)
import Web.Markup.SVG.Attributes (cx, cy, fill, height, r, strokeWidth, width, x1, y1, x2, y2)

import Graph (Graph, Link(..), mkGraph)
import Force (RenderGraph, mkRenderGraph)
import UI (FeedbackEvent(..), Effects, runUI)
import Vec2 (Vec2(..), runVec2)
import Util (format)

type Node = { color :: String }
type State = RenderGraph Node

center :: Vec2
center = Vec2 {x: 800.0, y: 400.0}

state :: RenderGraph Node
state = mkRenderGraph center 0.001 testGraph

render :: forall e. Channel FeedbackEvent -> State
                 -> Markup (Eff (channel :: CHANNEL | e) Unit)
render ch st =
  svg [ width "100%", height "100%" ] $
    (g [class_ "links"] $ fold renderLinks) <>
    (g [class_ "nodes"] $ fold renderNodes) <>
    (g [class_ "text"] $ text st.status)
  where
  renderNodes = st.graph.nodes # A.mapWithIndex \i n ->
    let
      c = runVec2 n.coords
    in
    circle [ cx $ format c.x, cy $ format c.y, r "5", fill n.payload.color
           , on_ E.MouseDown (send ch $ Held     i)
           , on_ E.MouseMove (send ch $ Moved    i)
           , on_ E.MouseUp   (send ch $ Released i)
           ] mempty
  renderLinks = st.graph.links <#> \(Link from to _) ->
    let
      n1 = unsafePartial $ A.unsafeIndex st.graph.nodes from
      n2 = unsafePartial $ A.unsafeIndex st.graph.nodes to
      c1 = runVec2 n1.coords
      c2 = runVec2 n2.coords
    in
      line [ strokeWidth "1"
           , x1 $ format c1.x, x2 $ format c2.x
           , y1 $ format c1.y, y2 $ format c2.y
           ] mempty

main :: forall e. Eff (Effects e) Unit
main = runUI (render) state

testGraph :: Graph Node Unit
testGraph = mkGraph
      [ {color: "red" }
      , {color: "red" }
      , {color: "red" }
      , {color: "red" }
      , {color: "red" }
      , {color: "red" }
      , {color: "red" }
      , {color: "red" }
      , {color: "red" }
      , {color: "red" }
      ,  {color: "yellow" }
      ,  {color: "yellow" }
      ,  {color: "blue" }
      ,  {color: "yellow" }
      ,  {color: "yellow" }
      ,  {color: "yellow" }
      ,  {color: "blue" }
      ,  {color: "blue" }
      ,  {color: "blue" }
      ,  {color: "blue" }
      ,  {color: "blue" }
      ,  {color: "blue" }
      ,  {color: "blue" }
      ,  {color: "blue" }
      ,  {color: "black" }
      ,  {color: "black" }
      ,  {color: "magenta" }
      ,  {color: "black" }
      ,  {color: "green" }
      ,  {color: "yellow" }
      ,  {color: "blue" }
      ,  {color: "yellow" }
      ,  {color: "yellow" }
      ,  {color: "yellow" }
      ,  {color: "yellow" }
      ,  {color: "yellow" }
      ,  {color: "yellow" }
      ,  {color: "yellow" }
      ,  {color: "yellow" }
      ,  {color: "black" }
      ,  {color: "cyan" }
      ,  {color: "black" }
      ,  {color: "black" }
      ,  {color: "magenta" }
      ,  {color: "green" }
      ,  {color: "green" }
      ,  {color: "grey" }
      ,  {color: "grey" }
      ,  {color: "orange" }
      ,  {color: "magenta" }
      ,  {color: "magenta" }
      ,  {color: "magenta" }
      ,  {color: "magenta" }
      ,  {color: "magenta" }
      ,  {color: "magenta" }
      ,  {color: "orange" }
      ,  {color: "magenta" }
      ,  {color: "orange" }
      ,  {color: "orange" }
      ,  {color: "orange" }
      ,  {color: "orange" }
      ,  {color: "orange" }
      ,  {color: "orange" }
      ,  {color: "orange" }
      ,  {color: "orange" }
      ,  {color: "orange" }
      ,  {color: "orange" }
      ,  {color: "beige" }
      ,  {color: "black" }
      ,  {color: "black" }
      ,  {color: "black" }
      ,  {color: "black" }
      ,  {color: "magenta" }
      ,  {color: "indigo" }
      ,  {color: "indigo" }
      ,  {color: "black" }
      ,  {color: "orange" }
      ]
      [ Link 1 0 unit
      , Link 2 0 unit
      , Link 3 0 unit
      , Link 3 2 unit
      , Link 4 0 unit
      , Link 5 0 unit
      , Link 6 0 unit
      , Link 7 0 unit
      , Link 8 0 unit
      , Link 9 0 unit
      , Link 11 10 unit
      , Link 11 3 unit
      , Link 11 2 unit
      , Link 11 0 unit
      , Link 12 11 unit
      , Link 13 11 unit
      , Link 14 11 unit
      , Link 15 11 unit
      , Link 17 16 unit
      , Link 18 16 unit
      , Link 18 17 unit
      , Link 19 16 unit
      , Link 19 17 unit
      , Link 19 18 unit
      , Link 20 16 unit
      , Link 20 17 unit
      , Link 20 18 unit
      , Link 20 19 unit
      , Link 21 16 unit
      , Link 21 17 unit
      , Link 21 18 unit
      , Link 21 19 unit
      , Link 21 20 unit
      , Link 22 16 unit
      , Link 22 17 unit
      , Link 22 18 unit
      , Link 22 19 unit
      , Link 22 20 unit
      , Link 22 21 unit
      , Link 23 16 unit
      , Link 23 17 unit
      , Link 23 18 unit
      , Link 23 19 unit
      , Link 23 20 unit
      , Link 23 21 unit
      , Link 23 22 unit
      , Link 23 12 unit
      , Link 23 11 unit
      , Link 24 23 unit
      , Link 24 11 unit
      , Link 25 24 unit
      , Link 25 23 unit
      , Link 25 11 unit
      , Link 26 24 unit
      , Link 26 11 unit
      , Link 26 16 unit
      , Link 26 25 unit
      , Link 27 11 unit
      , Link 27 23 unit
      , Link 27 25 unit
      , Link 27 24 unit
      , Link 27 26 unit
      , Link 28 11 unit
      , Link 28 27 unit
      , Link 29 23 unit
      , Link 29 27 unit
      , Link 29 11 unit
      , Link 30 23 unit
      , Link 31 30 unit
      , Link 31 11 unit
      , Link 31 23 unit
      , Link 31 27 unit
      , Link 32 11 unit
      , Link 33 11 unit
      , Link 33 27 unit
      , Link 34 11 unit
      , Link 34 29 unit
      , Link 35 11 unit
      , Link 35 34 unit
      , Link 35 29 unit
      , Link 36 34 unit
      , Link 36 35 unit
      , Link 36 11 unit
      , Link 36 29 unit
      , Link 37 34 unit
      , Link 37 35 unit
      , Link 37 36 unit
      , Link 37 11 unit
      , Link 37 29 unit
      , Link 38 34 unit
      , Link 38 35 unit
      , Link 38 36 unit
      , Link 38 37 unit
      , Link 38 11 unit
      , Link 38 29 unit
      , Link 39 25 unit
      , Link 40 25 unit
      , Link 41 24 unit
      , Link 41 25 unit
      , Link 42 41 unit
      , Link 42 25 unit
      , Link 42 24 unit
      , Link 43 11 unit
      , Link 43 26 unit
      , Link 43 27 unit
      , Link 44 28 unit
      , Link 44 11 unit
      , Link 45 28 unit
      , Link 47 46 unit
      , Link 48 47 unit
      , Link 48 25 unit
      , Link 48 27 unit
      , Link 48 11 unit
      , Link 49 26 unit
      , Link 49 11 unit
      , Link 50 49 unit
      , Link 50 24 unit
      , Link 51 49 unit
      , Link 51 26 unit
      , Link 51 11 unit
      , Link 52 51 unit
      , Link 52 39 unit
      , Link 53 51 unit
      , Link 54 51 unit
      , Link 54 49 unit
      , Link 54 26 unit
      , Link 55 51 unit
      , Link 55 49 unit
      , Link 55 39 unit
      , Link 55 54 unit
      , Link 55 26 unit
      , Link 55 11 unit
      , Link 55 16 unit
      , Link 55 25 unit
      , Link 55 41 unit
      , Link 55 48 unit
      , Link 56 49 unit
      , Link 56 55 unit
      , Link 57 55 unit
      , Link 57 41 unit
      , Link 57 48 unit
      , Link 58 55 unit
      , Link 58 48 unit
      , Link 58 27 unit
      , Link 58 57 unit
      , Link 58 11 unit
      , Link 59 58 unit
      , Link 59 55 unit
      , Link 59 48 unit
      , Link 59 57 unit
      , Link 60 48 unit
      , Link 60 58 unit
      , Link 60 59 unit
      , Link 61 48 unit
      , Link 61 58 unit
      , Link 61 60 unit
      , Link 61 59 unit
      , Link 61 57 unit
      , Link 61 55 unit
      , Link 62 55 unit
      , Link 62 58 unit
      , Link 62 59 unit
      , Link 62 48 unit
      , Link 62 57 unit
      , Link 62 41 unit
      , Link 62 61 unit
      , Link 62 60 unit
      , Link 63 59 unit
      , Link 63 48 unit
      , Link 63 62 unit
      , Link 63 57 unit
      , Link 63 58 unit
      , Link 63 61 unit
      , Link 63 60 unit
      , Link 63 55 unit
      , Link 64 55 unit
      , Link 64 62 unit
      , Link 64 48 unit
      , Link 64 63 unit
      , Link 64 58 unit
      , Link 64 61 unit
      , Link 64 60 unit
      , Link 64 59 unit
      , Link 64 57 unit
      , Link 64 11 unit
      , Link 65 63 unit
      , Link 65 64 unit
      , Link 65 48 unit
      , Link 65 62 unit
      , Link 65 58 unit
      , Link 65 61 unit
      , Link 65 60 unit
      , Link 65 59 unit
      , Link 65 57 unit
      , Link 65 55 unit
      , Link 66 64 unit
      , Link 66 58 unit
      , Link 66 59 unit
      , Link 66 62 unit
      , Link 66 65 unit
      , Link 66 48 unit
      , Link 66 63 unit
      , Link 66 61 unit
      , Link 66 60 unit
      , Link 67 57 unit
      , Link 68 25 unit
      , Link 68 11 unit
      , Link 68 24 unit
      , Link 68 27 unit
      , Link 68 48 unit
      , Link 68 41 unit
      , Link 69 25 unit
      , Link 69 68 unit
      , Link 69 11 unit
      , Link 69 24 unit
      , Link 69 27 unit
      , Link 69 48 unit
      , Link 69 41 unit
      , Link 70 25 unit
      , Link 70 69 unit
      , Link 70 68 unit
      , Link 70 11 unit
      , Link 70 24 unit
      , Link 70 27 unit
      , Link 70 41 unit
      , Link 70 58 unit
      , Link 71 27 unit
      , Link 71 69 unit
      , Link 71 68 unit
      , Link 71 70 unit
      , Link 71 11 unit
      , Link 71 48 unit
      , Link 71 41 unit
      , Link 71 25 unit
      , Link 72 26 unit
      , Link 72 27 unit
      , Link 72 11 unit
      , Link 73 48 unit
      , Link 74 48 unit
      , Link 74 73 unit
      , Link 75 69 unit
      , Link 75 68 unit
      , Link 75 25 unit
      , Link 75 48 unit
      , Link 75 41 unit
      , Link 75 70 unit
      , Link 75 71 unit
      , Link 76 64 unit
      , Link 76 65 unit
      , Link 76 66 unit
      , Link 76 63 unit
      , Link 76 62 unit
      , Link 76 48 unit
      , Link 76 58 unit
      ]
