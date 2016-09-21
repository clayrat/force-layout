module UI where

import Prelude
import Partial.Unsafe (unsafePartial)

import Data.Array as A
import Data.Maybe (Maybe(..), fromJust)
import Data.Tuple.Nested ((/\))

import Control.Monad.Eff (Eff)
import Control.Monad.Eff.Timer (TIMER)
import DOM (DOM)

import Signal (runSignal, (<~), (~), foldp, sampleOn)
import Signal.Channel (CHANNEL, Channel, channel, subscribe)
import Signal.DOM (animationFrame, mousePos, CoordinatePair)
import Signal.Time (Time)

import Web.Markup (Markup)
import Web.Markup.IncDOM (renderToBody)

import Graph (Id)
import Force (RenderGraph, evolveForces)
import Vec2 (wrapCP, zeroV2)

type Effects e = ( dom :: DOM, timer :: TIMER, channel :: CHANNEL | e )

data FeedbackEvent = Init | Held Id | Moved Id | Dragged Id | Released Id

data Action = Noop | DragStart | Drag Id CoordinatePair | DragEnd

action :: CoordinatePair -> FeedbackEvent -> Time -> Action
action cp (Held _) _ = DragStart
action cp (Dragged i) _ = Drag i cp
action _ (Released _) _ = DragEnd
action _ _ _ = Noop

evolve :: forall a. Action -> RenderGraph a -> RenderGraph a
evolve a = evolveForces >>> evolveAction a
  where
  evolveAction DragStart rg = rg { alphaTarget = 0.3, alpha = 1.0, status = "DragStart" }
  evolveAction (Drag i cp) rg = rg { graph = rg.graph { nodes = unsafePartial $ fromJust $ A.modifyAt i (_ { coords = wrapCP cp, velocity = zeroV2 }) rg.graph.nodes }
                                   , status = "Drag"
                                   }
  evolveAction DragEnd rg = rg { alphaTarget = 0.0 , status = "DragEnd" }
  evolveAction Noop rg = rg { status = "Noop" }

detectDrag :: FeedbackEvent -> FeedbackEvent -> FeedbackEvent
detectDrag h@(Held _) Init  = h
detectDrag h@(Held _) (Released _) = h
detectDrag (Moved i2) (Held i1) | i1 == i2 = Dragged i1
                          | otherwise = Moved i2
detectDrag (Moved i2) (Dragged i1) | i1 == i2 = Dragged i1
                             | otherwise = Moved i2
detectDrag r@(Released _) _ = r
detectDrag _ _ = Init

runUI:: forall e a. (Channel FeedbackEvent -> RenderGraph a -> Markup (Eff (Effects e) Unit))
                  -> RenderGraph a -> Eff (Effects e) Unit
runUI render stInit = do
  chan <- channel Init
  mouse <- mousePos
  frames <- animationFrame
  let
   feedbackSignal = foldp detectDrag Init (subscribe chan)
   actionSignal = action <~ (sampleOn frames mouse) ~ feedbackSignal ~ frames
   stateSignal = foldp evolve stInit actionSignal
  runSignal $ renderToBody <~ render chan <~ stateSignal
