

GAME DESIGN DOCUMENT — DRAFT

**DeRailed**

*Working Title  ·  Rev 2.0  ·  15 April 2026*

Tags: Mobile · Puzzle · Strategy · Zen · Railroad · Hexagonal Grid

# **01 — Concept**

Zen railroad puzzle on a hex grid. The board is pre-filled with rotatable track segments. The player continuously rotates tiles to form a contiguous route. A single train departs after a short head start and advances along the built track. If the train reaches the end of contiguous track, it derails and the game ends. Stations sit on tiles throughout the board. When the train reaches a station it reverses and the player scores. Switches alternate exits on each pass, sending the train down different branches. There is no win condition — the player plays until derail, chasing the highest score.

*Mobile  ·  Puzzle / Strategy  ·  Hexagonal grid  ·  Zen / slow-burn  ·  \~10–20 min*

## **Mockup**

Origin (O), switch with direction indicator, branch A toward Station 1, unbuilt branch B (dashed), train mid-route. Unconnected tiles show misaligned grayed-out track — the pre-filled board state.

![Game mockup][image1]

# **02 — Reference Games**

## **Pipe Dream / Pipe Mania (1989)**

From the Pipe Dream bonus levels: (a) the board is pre-filled with segments and the player rotates them into a connected path; (b) the advancing flooz creates constant time pressure — stay ahead or lose. Both carry over directly: hex grid, train instead of slime. The head start before the train departs also comes from Pipe Mania.

## **![][image2]**

## **Mini Metro (2015)**

Pacing and aesthetic inspiration: slow zoom-out growth, zen feel, minimalist transit-map visual language (bold lines, simple shapes). Also the model for the no-win-condition score-attack structure.

![][image3]

# **03 — Tile Types**

All tiles pre-placed; player only rotates. Edges 0–5 clockwise, 60° apart. No 60° (tight) connections. Red dot on switch tiles \= stem edge (train entry from origin).

| TILE |  | EDGES | ORIENT. | NOTES |
| :---- | ----- | :---- | :---- | :---- |
| Straight | ![straight][image4] | N ↔ N+3 | 3 | Non-directional |
| Bend | ![bend][image5] | N ↔ N+2 | 6 | Non-directional |
| Double Bend | ![double\_bend][image6] | N↔N+2  and  N+3↔N+5 | 3 | Two parallel bends on one tile |
| 2-way Cross | ![cross2][image7] | N↔N+3  ×  N+1↔N+4 | 3 | Train follows entry direction, cannot turn |
| 3-way Cross | ![cross3][image8] | N↔N+3, N+1↔N+4, N+2↔N+5 | 1 | Fully symmetric — one orientation |
| Switch Left | ![switch\_l][image9] | Stem N → N+2, N+3 | 6 | Directional. Red dot \= stem |
| Switch Right | ![switch\_r][image10] | Stem N → N+3, N+4 | 6 | Directional. Mirror of Switch Left |

## **Switch Behaviour**

A switch has two exits and internal state tracking which exit is active. Each time the train passes through, the state flips (A, B, A, B…). If the active exit leads to unbuilt track, the train derails. Each switch displays a direction indicator (arrow or signal lamp) showing which exit will be taken next.

# **04 — Train System**

A single train runs on the network. The player gets a short head start before it departs (identical to Pipe Mania). Once moving, the train advances continuously along contiguous track. If it reaches the end of contiguous track, it derails and the game ends.

When the train reaches a station it reverses, giving the player the entire return journey as breathing room. The further the station from the last switch, the more time is bought. On the return leg, previously-encountered switches flip to their alternate exit, sending the train down a new branch. The player scores on each station visit.

# **05 — Board Expansion**

The board starts small and slowly zooms out as new hex tiles are revealed at the edges. New stations appear as territory expands. New tiles arrive in random orientations — the player must integrate them. Exact pacing (continuous, station-triggered, or timed) is TBD.

# **06 — Open Questions**

## **Train & Stations**

**?**  Station behaviour: always bounce, dead-end-only, or pass-through?

**?**  What happens if the train reaches a station without having passed through a switch? No branching point exists for the return journey.

**?**  Can tiles behind the train be re-rotated? If yes, what happens to the train?

**?**  Can the player toggle a switch indicator before the train’s first arrival at that switch?

**?**  How does difficulty scale as the network grows? Longer trips \= more time but more complexity. May need speed increase or other pressure.

## **Board & Expansion**

**?**  Expansion pacing: continuous zoom / station-triggered / timed pulse?

**?**  New tiles on expansion: random orientations or neutral by default?

## **Structure & Scoring**

**?**  Scoring model: per station visit / per tile traversed / per branch / combo?

**?**  Can loops coexist with the tree? (switch branches reconnecting downstream)

# **07 — Ideas to Explore**

Speculative mechanics and directions worth discussing. Not committed design — captured here so they aren't lost.

## **Tile swap mechanic**

Allow the player to swap the positions of two tiles rather than only rotating in place. Adds a spatial rearrangement dimension. Not for MVP — evaluate after core rotation gameplay is proven.

## **Reverse switch entry**

Currently switches are entered from the stem only. What if a train can enter from a branch and exit via the stem — the reverse direction? This would mean the train encounters a switch differently on the return leg from a station, potentially creating more complex routing behaviour without adding new tile types.

## **Origin as station**

Rather than treating the origin as a special fixed point, it could simply be another station. The train's goal is to connect stations in any arbitrary order. This simplifies the mental model and removes the origin as a hard constraint on network shape.

## **City growth (Transport Tycoon style)**

Stations could accumulate growth based on how frequently the train visits them. A heavily-visited station grows into a larger city, which could expand the board around it, spawn more tiles, or unlock new game elements. Inspired by Transport Tycoon's town growth mechanic.

## **Multiple trains**

Longer term: more than one train running on the same network simultaneously, sharing switches. Significantly increases complexity but could be a natural progression mode.

# **08 — References**

[Pipe Mania — Wikipedia](https://en.wikipedia.org/wiki/Pipe_Mania)  —  Original game, flooz pressure, bonus level

[Mini Metro — Wikipedia](https://en.wikipedia.org/wiki/Mini_Metro_\(video_game\))  —  Slow growth, zen feel, visual language, score-attack model

[Redblobgames: Hex Grids](https://www.redblobgames.com/grids/hexagons/)  —  Hex coordinate system and algorithms

***Further Reading***

[Railbound — Steam](https://store.steampowered.com/app/1967510/Railbound/)  —  Railroad puzzle on a grid — not a direct reference but worth knowing

[image1]: images/image1.png

[image2]: images/image2.png

[image3]: images/image3.png

[image4]: images/image4.png

[image5]: images/image5.png

[image6]: images/image6.png

[image7]: images/image7.png

[image8]: images/image8.png

[image9]: images/image9.png

[image10]: images/image10.png