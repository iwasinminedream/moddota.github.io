# ModDota Articles

Articles marked with * are outdated.

## Abilities

- [Ability KeyValues](https://iwasinminedream.github.io/moddota.github.io/abilities/ability-keyvalues/) — <!--
- [AbilityDuration tooltips](https://iwasinminedream.github.io/moddota.github.io/abilities/abilityduration-tooltips/) — TL;DR: AbilityDuration is a fairly useless keyvalue because whoever coded it forgot to make an automatic tooltip like with `AbilityDamage`. Use a "duration" AbilityValue and connect it with lua ins...
- [Calling Spells with SetCursor](https://iwasinminedream.github.io/moddota.github.io/abilities/calling-spells-with-setcursor/) — `CDotaBaseAbility:OnSpellStart` in combination with `CDotaBaseNPC:SetCursorCastTarget` and `CDOTABaseNPC:SetCursorPosition` are used to "Call" spells.
- [Creating innate (available from level 1) abilities](https://iwasinminedream.github.io/moddota.github.io/abilities/creating-innate-abilities/) — This article will guide you through creating an ability which is available to the given hero right away, like Earth Spirit's Stone Remnant.
- [Item KeyValues](https://iwasinminedream.github.io/moddota.github.io/abilities/item-keyvalues/) — A comprehensive guide to npcitemscustom and coding items
- [Lua Item Tutorial](https://iwasinminedream.github.io/moddota.github.io/abilities/lua-item-tutorial/) — This tutorial is walk-through of creating completely new item with the new itemlua base class. <br />
- [Making any ability use charges](https://iwasinminedream.github.io/moddota.github.io/abilities/making-any-ability-use-charges/) — A guide/snippet which will help you to make any ability use charges like Shrapnel or Stone Caller.
- [Using Modifier Properties in tooltips](https://iwasinminedream.github.io/moddota.github.io/abilities/modifier-properties-in-tooltips/) — Any time you see a modifier tooltip using a non-static number it's getting its value from one of that modifier's MODIFIERPROPERTY's
- [Passing AbilityValues values into Lua](https://iwasinminedream.github.io/moddota.github.io/abilities/passing-abilityvalues-values-into-lua/) — Given this "AbilityValues" block in the ability:
- [Reutilizing Built-In Modifiers](https://iwasinminedream.github.io/moddota.github.io/abilities/reutilizing-built-in-modifiers/) — Here it will be explained how to reuse any Built-In modifier through the datadriven system.
- [Sending Server values to the Client in a modifier.](https://iwasinminedream.github.io/moddota.github.io/abilities/server-to-client/) — Modifier scripts are run on both the server, and every client in the game.
- [Simple Custom Ability](https://iwasinminedream.github.io/moddota.github.io/abilities/simple-custom-ability/) — I have created a tutorial on making a simple custom ability here:
- [The importance of AbilityValues values](https://iwasinminedream.github.io/moddota.github.io/abilities/the-importance-of-abilityvalues-values/) — To specify numeric values, you can put in a number or you can use `%name` formatting to grab values out of the "AbilityValues" block of the ability. The advantage to using the `%name` syntax is tha...

## Abilities / Datadriven

- [All about the Target *](https://iwasinminedream.github.io/moddota.github.io/abilities/datadriven/all-about-the-target/) — I wanted to review a very old thread which was posted almost one year ago but still isn't completely well documented anywhere:
- [Apply Hero and Creep modifier durations *](https://iwasinminedream.github.io/moddota.github.io/abilities/datadriven/apply-hero-and-creep-modifier-durations/) — I came up with this method after kritth showed us that you can directly add a `"Duration"` key value to an `"ApplyModifier"` block and the use of the `"Target"` block without a Radius (defaulting t...
- [Channeling Animations *](https://iwasinminedream.github.io/moddota.github.io/abilities/datadriven/channeling-animations/) — ApplyModifier with short duration in a OnThinkInterval, channeling modifier has an OverrideAnimation with a ACT from the Action List or with the method explained later.
- [DataDriven Ability Events & Modifiers *](https://iwasinminedream.github.io/moddota.github.io/abilities/datadriven/datadriven-ability-events-modifiers/) — A guide that tries to cover every Ability & Modifier Event of the abilitydatadriven system, with examples.
- [Illusion Ability Example *](https://iwasinminedream.github.io/moddota.github.io/abilities/datadriven/illusion-ability-example/) — This is a lua script to properly create an illusion.
- [Invisibility Ability Example *](https://iwasinminedream.github.io/moddota.github.io/abilities/datadriven/invisibility-ability-example/) — This is a datadriven + lua ability that will apply the invis state and texture, with some extra particles and effects.
- [Physics Ability Example - Exorcism *](https://iwasinminedream.github.io/moddota.github.io/abilities/datadriven/physics-ability-example-exorcism/) — Here's in the breakdown of an ability that spawns units and moves them with rotation, making use of the Physics library
- [Point Channeling AoE Ability Example *](https://iwasinminedream.github.io/moddota.github.io/abilities/datadriven/point-channeling-aoe-ability-example/) — Here I'll explain a method to do this type of abilities effectively, based on this Earthquake Example:
- [Rotate Ability Example *](https://iwasinminedream.github.io/moddota.github.io/abilities/datadriven/rotate-ability-example/) — Block

## Abilities / Lua-modifiers

- [Extending Hero/NPC API with lua modifiers](https://iwasinminedream.github.io/moddota.github.io/abilities/lua-modifiers/1/) — When creating cool new abilities or game mechanics you often run into issues with the lack of good API. While I admit the dota 2 has massive API, it seems to focus on few very odd things or mechani...
- [Linken's Sphere & Lotus Orb](https://iwasinminedream.github.io/moddota.github.io/abilities/lua-modifiers/2/) — When you script your targeted lua abilities you may have had issue of the protection against such spells not working. Linken Sphere and Lotus Orb.
- [Transformations](https://iwasinminedream.github.io/moddota.github.io/abilities/lua-modifiers/3/) — For this tutorial I am cheating and not explaining how to make lua ability. If you want to see full example of the code click here!
- [Enchanting Trees](https://iwasinminedream.github.io/moddota.github.io/abilities/lua-modifiers/4/) — Without further delay. Lets get to it!
- [Custom Barriers](https://iwasinminedream.github.io/moddota.github.io/abilities/lua-modifiers/5/) — In this tutorial I'll be going over what barriers are, and how they are created and handled.

## Assets

- [Asset File Type Reference](https://iwasinminedream.github.io/moddota.github.io/assets/asset-file-type-reference/) — This list contains all the info for asset types with its related tools & guides explaining the formats.
- [Custom Minimap Icons](https://iwasinminedream.github.io/moddota.github.io/assets/custom-minimap-icons/) — Here is a quick and simple step by step guide on how to make and use your own minimap icons for creatures
- [Custom Sounds](https://iwasinminedream.github.io/moddota.github.io/assets/custom-sounds/) — Here's an step by step guide to custom sound events.
- [Extracting and Compiling VTEX files](https://iwasinminedream.github.io/moddota.github.io/assets/extracting-and-compiling-vtex-files/) — Hello everybody. Recently, I've been looking through the .VTEX files used by most of the sprites and particle effects in-game, but I couldn't find any extensive documentation about it. Therefore, I...

## Assets / Maps

- [Hammer Tutorials](https://iwasinminedream.github.io/moddota.github.io/assets/maps/hammer-tutorials/) — <YouTube id="GMvmdnNM6Sc" />
- [Making skip/clip blocks out of models](https://iwasinminedream.github.io/moddota.github.io/assets/maps/making-skip-clip-blocks-out-of-models/) — This is the quickest but one very useful tip for Hammer map design.

## Assets / Models

- [Adding Hitbox to Models without a Bone](https://iwasinminedream.github.io/moddota.github.io/assets/models/adding-hitbox-to-models-without-a-bone/) — If you tried some of Valve's prop models, you had already noticed that many of them don't have a hitbox, so they can't be used for selectable units.
- [Custom Hero models, materials and animations](https://iwasinminedream.github.io/moddota.github.io/assets/models/custom-hero-models-materials-animations/) — <YouTube id="RjSPY81cLmQ" />
- [Exporting Models and Materials/Textures](https://iwasinminedream.github.io/moddota.github.io/assets/models/exporting-models-and-materials-textures/) — <YouTube id="e3vvRUjlW7k" />
- [Importing custom models](https://iwasinminedream.github.io/moddota.github.io/assets/models/importing-custom-models/) — <p>Many people probably have the idea of using custom models into the map but having a hard time with importing models into the engine, importing animation for the models, importing texture for the...
- [Importing models and using the material editor](https://iwasinminedream.github.io/moddota.github.io/assets/models/importing-models-and-using-material-editor/) — <YouTube id="Y3aeaD-icSc" />
- [MDL to VMDL Conversion](https://iwasinminedream.github.io/moddota.github.io/assets/models/mdl-to-vmdl-conversion/) — This guide will go through the process of making a .vmdl file (Source 2 Model) from a .mdl file and other model-related files from Source 1. The Wyvern Hatchling courier will be used as example, bu...

## Assets / Particles

- [Chaos Wave Particle](https://iwasinminedream.github.io/moddota.github.io/assets/particles/chaos-wave-particle/) — <a name="intro"></a><h1>Introduction</h1>
- [Falling cherry blossom petal for spring mood particle](https://iwasinminedream.github.io/moddota.github.io/assets/particles/falling-cherry-blossom-petal-for-spring-mood-particle/) — <p>
- [Particle Basics](https://iwasinminedream.github.io/moddota.github.io/assets/particles/particle-basics/) — <p>
- [Particle Tutorial          # Title of your article (required)](https://iwasinminedream.github.io/moddota.github.io/assets/particles/particle-tutorial/) — Important Note: This article is strongly connected to an extern particle tool and tutorial collection and most links will guide you there: Github.
- [Status Effects](https://iwasinminedream.github.io/moddota.github.io/assets/particles/status-effects/) — This is a basic guide on how to create/modify status effect particles in the particle editor. This is my first tutorial so any feedback is welcome. A template file is at the bottom of the tutorial ...
- [Volcano Particle](https://iwasinminedream.github.io/moddota.github.io/assets/particles/volcano-particle/) — Here I'll explain how to modify preexisting particles for the creation of a Volcano ability :nuke:

## General

- [Contribute](https://iwasinminedream.github.io/moddota.github.io/contribute/) — The easiest way to create a new article is to use our built-in
- [Getting Started](https://iwasinminedream.github.io/moddota.github.io/getting-started/) — So you're completely new to Dota 2 modding? Don't know where in the hell to begin? This is the guide for you, the future Dota 2 modder!
- [Scripting Introduction](https://iwasinminedream.github.io/moddota.github.io/scripting-introduction/) — Part 2 of Getting Started With Dota 2 Modding, this tutorial is meant to explain the basics of programming Dota 2 custom mods.

## Panorama

- [Button Examples            # Title of your article (required)](https://iwasinminedream.github.io/moddota.github.io/panorama/button-examples/) — Here are some button examples that you can use in your custom games.
- [DOTAScenePanel](https://iwasinminedream.github.io/moddota.github.io/panorama/dotascenepanel/) — In this tutorial we'll go through the tricks you can do with the undocumented DOTAScenePanel class in panorama.
- [Hiding HUD with SetHUDVisible *](https://iwasinminedream.github.io/moddota.github.io/panorama/hiding-hud-with-sethudvisible/) — This tutorial is outdated. It's recommended to use Panorama for UI manipulation now.
- [Inclusive Panorama UI](https://iwasinminedream.github.io/moddota.github.io/panorama/inclusive-panorama-ui/) — <YouTube id="ZVXaO4rrL6A" />
- [Introduction to Panorama UI with TypeScript](https://iwasinminedream.github.io/moddota.github.io/panorama/introduction-to-panorama-ui-with-typescript/) — TypeScript is a language created by and for people that were unhappy with Javascript and all of its quirks and flaws. TypeScript is a language with its own syntax (although similar to Javascript) t...
- [Keybindings](https://iwasinminedream.github.io/moddota.github.io/panorama/keybindings/) — With the recent update (20th of july) valve added support for custom keybindings. That is, you can bind key's to fire a custom command.
- [React in Panorama](https://iwasinminedream.github.io/moddota.github.io/panorama/react/) — React is a JavaScript library for building user interfaces. It allows you to break down UI into small reusable building blocks (components) and simplifies state management.
- [Bundling scripts with webpack](https://iwasinminedream.github.io/moddota.github.io/panorama/webpack/) — Working on a large codebase there are two ways to organize your code. The first is just keeping all logic in a single `.js` file, which quickly becomes hard to change and comprehend. The second app...

## Scripting / Typescript

- [Tooltip Generator](https://iwasinminedream.github.io/moddota.github.io/scripting/Typescript/tooltip-generator/) — Recently, the development of a new project that named the Tooltip Generator has been completed. This project was inspired by Ark's Eaglesong idea which purpose was to make adding localization as ea...
- [Abilities in Typescript](https://iwasinminedream.github.io/moddota.github.io/scripting/Typescript/typescript-ability/) — Regardless of what kind of game you're going for, you'll most probably have to code a couple of abilities for your characters to use to fight whatever they need to fight. Typescript enables coding ...
- [Events and Timers in Typescript](https://iwasinminedream.github.io/moddota.github.io/scripting/Typescript/typescript-events/) — As you may know, Dota has many events. While developing a custom game, listening to events is very useful, as it allows you to do something when something occurs. For example, listening to an event...
- [Typescript Introduction](https://iwasinminedream.github.io/moddota.github.io/scripting/Typescript/typescript-introduction/) — Typescript is a powerful tool that we can use to improve our ability to properly script files for Dota 2. Using tstl (Typescript-to-Lua), it automatically generates a Lua file for the game to use f...
- [Modifiers in Typescript](https://iwasinminedream.github.io/moddota.github.io/scripting/Typescript/typescript-modifier/) — Modifiers are an extremely important part of almost any Dota custom game. They allow you to modify certain properties of your hero, deal damage to it over time, or apply various effects on it. Like...

## Scripting

- [Advanced rpg looting chest in typescript     # Title of your article (required)](https://iwasinminedream.github.io/moddota.github.io/scripting/advanced-looting-chest/) — In this guide you will learn to create a channeling chest, which drops loot.
- [Custom Mana System](https://iwasinminedream.github.io/moddota.github.io/scripting/custom-mana-system/) — This is a guide to make a simple custom mana system. A working barebones addon is assumed.
- [Item Drop System](https://iwasinminedream.github.io/moddota.github.io/scripting/item-drop-system/) — Here I'll go over the implementation of a flexible item drop system for any sort of gamemode, mostly useful for RPGs.
- [Item Restrictions & Requirements](https://iwasinminedream.github.io/moddota.github.io/scripting/item-restrictions-requirements/) — This implements the following mechanic:
- [Lava damage](https://iwasinminedream.github.io/moddota.github.io/scripting/lava-damage/) — Hello, this is a small tutorial giving back to the awesome Moddota community.
- [Making a "rpg-like" looting chest](https://iwasinminedream.github.io/moddota.github.io/scripting/making-a-rpg-like-looting-chest/) — Hello , it's the first time i'm making a tutorial here (and on lua too)
- [Particle Attachment](https://iwasinminedream.github.io/moddota.github.io/scripting/particle-attachment/) — Each particle system in Dota is designed for a certain purpose, for example:
- [Precache, Fixing and avoiding issues](https://iwasinminedream.github.io/moddota.github.io/scripting/precache-fixing-and-avoiding-issues/) — When spawning units through KV and Lua, you might have to deal with the precache-dilemma. This also applies to particles and sounds. I talked about it briefly in the precache section of the datadri...
- [Scripted Shop Spawning](https://iwasinminedream.github.io/moddota.github.io/scripting/scripted-shop-spawning/) — A feature commonly asked about is how to dynamically create shops. Turns out it's actually quite easy! Here's what to do.
- [Using the order filter and other filters](https://iwasinminedream.github.io/moddota.github.io/scripting/using-dota-filters/) — This tutorial explains the use of the different filter functions currentlly in the API, and illustrates this using a small example in the order filter.
- [Basic Vector Math](https://iwasinminedream.github.io/moddota.github.io/scripting/vector-math/) — While creating games it is hard to avoid using vector math, however they are not commonly taught in schools. While they are fairly intuitive once you get used to them, learning about vector math fo...

## Tools

- [Combining KV files using #base](https://iwasinminedream.github.io/moddota.github.io/tools/combining-kv-files-using-base/) — Having one kv file containing every unit or ability definition as is default in the mod interface can become very annoying very quickly. Splitting up this one file into several smaller KV files mak...
- [GitHub Repositories and Search](https://iwasinminedream.github.io/moddota.github.io/tools/github-repos-and-search/) —  TypeScript Template
- [improvement vConsole](https://iwasinminedream.github.io/moddota.github.io/tools/improvement-vConsole/) — Dota2 Tools have a console `vConsole2.exe`
- [Setting Up Your Addon For Collaboration](https://iwasinminedream.github.io/moddota.github.io/tools/setting-up-for-collaboration/) — Talking to dota 2 mod developers, or just software developers in general, you will often hear the words 'repositories', 'version control' and 'git'. The reason these are such popular topics is that...
- [Setting Up Your Addon With GitHub](https://iwasinminedream.github.io/moddota.github.io/tools/setting-up-your-addon-with-github/) — Split the game into a `game` and `content` folder, then add junctions or symlinks to link them with the Dota files.
- [Useful Console Commands](https://iwasinminedream.github.io/moddota.github.io/tools/useful-console-commands/) — Here are the console commands useful for modding. If you constantly use one which isn't on this list, please post it

## Units

- [Adding a Very Simple AI to Units](https://iwasinminedream.github.io/moddota.github.io/units/adding-a-very-simple-ai-to-units/) — This tutorial will cover how to issue very simple orders to units. This tutorial uses a move order to make a unit wander inside an area randomly, and a cast order to make a unit cast an untargeted ...
- [Create Creature AttachWearable blocks directly from the keyvalues](https://iwasinminedream.github.io/moddota.github.io/units/create-creature-attachwearable-blocks-directly-from-the-keyvalues/) — For those still Ctrl+F'ing and copying from itemsgame.txt I bring you the better solution:
- [Creating units with a duration](https://iwasinminedream.github.io/moddota.github.io/units/creating-units-with-a-duration/) — This is a quick tutorial on how to create custom units so that they appear with a circular timer next to their health bar and the time remaining on the XP bar
- [Writing a simple AI for neutrals](https://iwasinminedream.github.io/moddota.github.io/units/simple-neutral-ai/) — NOTE: This article is a rewrite of a very old AI tutorial: http://yrrep.me/dota/dota-simple-ai.html
- [Unit KeyValues](https://iwasinminedream.github.io/moddota.github.io/units/unit-keyvalues/) — This document covers every keyvalue of the npcunitscustom file
- [Unit producing buildings](https://iwasinminedream.github.io/moddota.github.io/units/unit-producing-buildings/) — This is a response tutorial on @Lemon30 question thread, I'm gonna explain the scripting approaches to fully spawning units with a building, including making them controllable and defining initial ...

