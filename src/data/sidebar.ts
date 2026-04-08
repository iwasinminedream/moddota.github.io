export interface SidebarItem {
  label: string;
  slug?: string;
  href?: string;
  items?: SidebarItem[];
}

export const sidebar: SidebarItem[] = [
  { label: 'Home', slug: 'index' },
  { label: 'Getting Started', slug: 'getting-started' },
  { label: 'Scripting Introduction', slug: 'scripting-introduction' },
  {
    label: 'Typescript',
    items: [
      { label: 'Introduction', slug: 'scripting/typescript/typescript-introduction' },
      { label: 'Abilities', slug: 'scripting/typescript/typescript-ability' },
      { label: 'Modifiers', slug: 'scripting/typescript/typescript-modifier' },
      { label: 'Events', slug: 'scripting/typescript/typescript-events' },
      { label: 'Tooltip Generator', slug: 'scripting/typescript/tooltip-generator' },
    ],
  },
  {
    label: 'Abilities, items, modifiers',
    items: [
      { label: 'Ability KeyValues', slug: 'abilities/ability-keyvalues' },
      { label: 'Item KeyValues', slug: 'abilities/item-keyvalues' },
      { label: 'The Importance of AbilityValues Values', slug: 'abilities/the-importance-of-abilityvalues-values' },
      { label: 'Passing AbilityValues Values into Lua', slug: 'abilities/passing-abilityvalues-values-into-lua' },
      { label: 'AbilityDuration Tooltips', slug: 'abilities/abilityduration-tooltips' },
      { label: 'Simple Custom Ability', slug: 'abilities/simple-custom-ability' },
      { label: 'Creating Innate Abilities', slug: 'abilities/creating-innate-abilities' },
      { label: 'Making Any Ability Use Charges', slug: 'abilities/making-any-ability-use-charges' },
      { label: 'Calling Spells With SetCursor', slug: 'abilities/calling-spells-with-setcursor' },
      {
        label: 'Lua Abilities and Modifiers',
        href: 'https://developer.valvesoftware.com/wiki/Dota_2_Workshop_Tools/Lua_Abilities_and_Modifiers',
      },
      { label: 'Lua Item Tutorial', slug: 'abilities/lua-item-tutorial' },
      {
        label: 'Lua Modifiers',
        items: [
          { label: 'Part 1', slug: 'abilities/lua-modifiers/1' },
          { label: 'Part 2', slug: 'abilities/lua-modifiers/2' },
          { label: 'Part 3', slug: 'abilities/lua-modifiers/3' },
          { label: 'Part 4', slug: 'abilities/lua-modifiers/4' },
          { label: 'Part 5', slug: 'abilities/lua-modifiers/5' },
        ],
      },
      { label: 'Reutilizing Built-in Modifiers', slug: 'abilities/reutilizing-built-in-modifiers' },
      {
        label: 'Datadriven *',
        items: [
          { label: 'Events & Modifiers *', slug: 'abilities/datadriven/datadriven-ability-events-modifiers' },
          { label: 'All About the Target *', slug: 'abilities/datadriven/all-about-the-target' },
          { label: 'Channeling Animations *', slug: 'abilities/datadriven/channeling-animations' },
          { label: 'Invisibility Example *', slug: 'abilities/datadriven/invisibility-ability-example' },
          { label: 'Illusion Example *', slug: 'abilities/datadriven/illusion-ability-example' },
          { label: 'Rotate Example *', slug: 'abilities/datadriven/rotate-ability-example' },
          { label: 'Point Channeling AOE Example *', slug: 'abilities/datadriven/point-channeling-aoe-ability-example' },
          { label: 'Hero & Creep Modifier Durations *', slug: 'abilities/datadriven/apply-hero-and-creep-modifier-durations' },
          { label: 'Physics Example (Exorcism) *', slug: 'abilities/datadriven/physics-ability-example-exorcism' },
        ],
      },
      { label: 'Modifier Properties in Tooltips', slug: 'abilities/modifier-properties-in-tooltips' },
      { label: 'Server to Client', slug: 'abilities/server-to-client' },
    ],
  },
  {
    label: 'Units',
    items: [
      { label: 'Unit KeyValues', slug: 'units/unit-keyvalues' },
      { label: 'Unit Producing Buildings', slug: 'units/unit-producing-buildings' },
      { label: 'Creating Units with a Duration', slug: 'units/creating-units-with-a-duration' },
      { label: 'Adding a Very Simple AI to Units', slug: 'units/adding-a-very-simple-ai-to-units' },
      { label: 'Simple Neutral AI', slug: 'units/simple-neutral-ai' },
      { label: 'Create Creature AttachWearable Blocks from KV', slug: 'units/create-creature-attachwearable-blocks-directly-from-the-keyvalues' },
    ],
  },
  {
    label: 'Scripting',
    items: [
      { label: 'Custom Mana System', slug: 'scripting/custom-mana-system' },
      { label: 'Item Restrictions/Requirements', slug: 'scripting/item-restrictions-requirements' },
      { label: 'Item Drop System', slug: 'scripting/item-drop-system' },
      { label: 'Making a RPG-like Looting Chest', slug: 'scripting/making-a-rpg-like-looting-chest' },
      { label: 'Scripted Shop Spawning', slug: 'scripting/scripted-shop-spawning' },
      { label: 'Lava Damage', slug: 'scripting/lava-damage' },
      { label: 'Using Dota Filters', slug: 'scripting/using-dota-filters' },
      { label: 'Particle Attachment', slug: 'scripting/particle-attachment' },
      { label: 'Vector Math', slug: 'scripting/vector-math' },
      { label: 'Precache Fixing and Avoiding Issues', slug: 'scripting/precache-fixing-and-avoiding-issues' },
      {
        label: 'Custom NetTables',
        href: 'https://developer.valvesoftware.com/wiki/Dota_2_Workshop_Tools/Custom_Nettables',
      },
      { label: 'Advanced Looting Chest', slug: 'scripting/advanced-looting-chest' },
    ],
  },
  {
    label: 'Panorama UI',
    items: [
      {
        label: 'Introduction',
        href: 'https://developer.valvesoftware.com/wiki/Dota_2_Workshop_Tools/Panorama',
      },
      { label: 'Inclusive Panorama UI', slug: 'panorama/inclusive-panorama-ui' },
      { label: 'Panorama UI with TypeScript', slug: 'panorama/introduction-to-panorama-ui-with-typescript' },
      { label: 'Keybindings', slug: 'panorama/keybindings' },
      { label: 'DOTAScenePanel', slug: 'panorama/dotascenepanel' },
      { label: 'Button Examples', slug: 'panorama/button-examples' },
      {
        label: 'Custom Game Setup',
        href: 'https://developer.valvesoftware.com/wiki/Dota_2_Workshop_Tools/Custom_Game_Setup',
      },
      { label: 'Hiding HUD with SetHUDVisible *', slug: 'panorama/hiding-hud-with-sethudvisible' },
      { label: 'Webpack', slug: 'panorama/webpack' },
      { label: 'React', slug: 'panorama/react' },
    ],
  },
  {
    label: 'Assets',
    items: [
      { label: 'Asset File Type Reference', slug: 'assets/asset-file-type-reference' },
      {
        label: 'Maps',
        items: [
          { label: 'Hammer Tutorials', slug: 'assets/maps/hammer-tutorials' },
          { label: 'Making Skip Clip Blocks out of Models', slug: 'assets/maps/making-skip-clip-blocks-out-of-models' },
        ],
      },
      {
        label: 'Models',
        items: [
          { label: 'Importing Custom Models', slug: 'assets/models/importing-custom-models' },
          { label: 'MDL to VMDL Conversion', slug: 'assets/models/mdl-to-vmdl-conversion' },
          { label: 'Adding Hitbox to Models Without a Bone', slug: 'assets/models/adding-hitbox-to-models-without-a-bone' },
          { label: 'Importing Models and Using Material Editor', slug: 'assets/models/importing-models-and-using-material-editor' },
          { label: 'Exporting Models and Materials/Textures', slug: 'assets/models/exporting-models-and-materials-textures' },
          { label: 'Custom Hero Models, Materials, Animations', slug: 'assets/models/custom-hero-models-materials-animations' },
        ],
      },
      {
        label: 'Particles',
        items: [
          { label: 'Particle Tutorial', slug: 'assets/particles/particle-tutorial' },
          { label: 'Particle Basics', slug: 'assets/particles/particle-basics' },
          { label: 'Chaos Wave Particle', slug: 'assets/particles/chaos-wave-particle' },
          { label: 'Cherry Blossom Petal Particle', slug: 'assets/particles/falling-cherry-blossom-petal-for-spring-mood-particle' },
          { label: 'Volcano Particle', slug: 'assets/particles/volcano-particle' },
          { label: 'Status Effects', slug: 'assets/particles/status-effects' },
        ],
      },
      { label: 'Custom Sounds', slug: 'assets/custom-sounds' },
      { label: 'Extracting and Compiling VTEX Files', slug: 'assets/extracting-and-compiling-vtex-files' },
      { label: 'Custom Minimap Icons', slug: 'assets/custom-minimap-icons' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'Setting Up for Collaboration', slug: 'tools/setting-up-for-collaboration' },
      { label: 'Useful Console Commands', slug: 'tools/useful-console-commands' },
      { label: 'Setting Up Your Addon with GitHub', slug: 'tools/setting-up-your-addon-with-github' },
      { label: 'Combining KV Files Using #base', slug: 'tools/combining-kv-files-using-base' },
      { label: 'Improvement vConsole', slug: 'tools/improvement-vconsole' },
      { label: 'GitHub Repos and Search', slug: 'tools/github-repos-and-search' },
    ],
  },
  { label: 'Contribute', slug: 'contribute' },
];
