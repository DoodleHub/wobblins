import abyssLord from "@/assets/images/wobblins/species/abyss-lord.png";
import ancientTreant from "@/assets/images/wobblins/species/ancient-treant.png";
import aquabub from "@/assets/images/wobblins/species/aquabub.png";
import arcticFenrir from "@/assets/images/wobblins/species/arctic-fenrir.png";
import astralGuardian from "@/assets/images/wobblins/species/astral-guardian.png";
import celestialPhoenix from "@/assets/images/wobblins/species/celestial-phoenix.png";
import emberling from "@/assets/images/wobblins/species/emberling.png";
import flamefox from "@/assets/images/wobblins/species/flamefox.png";
import frostling from "@/assets/images/wobblins/species/frostling.png";
import glacierWolf from "@/assets/images/wobblins/species/glacier-wolf.png";
import infernodrake from "@/assets/images/wobblins/species/infernodrake.png";
import lumina from "@/assets/images/wobblins/species/lumina.png";
import mountainColossus from "@/assets/images/wobblins/species/mountain-colossus.png";
import nightfiend from "@/assets/images/wobblins/species/nightfiend.png";
import oceanTitan from "@/assets/images/wobblins/species/ocean-titan.png";
import pebblit from "@/assets/images/wobblins/species/pebblit.png";
import plagueHydra from "@/assets/images/wobblins/species/plague-hydra.png";
import radiantSprite from "@/assets/images/wobblins/species/radiant-sprite.png";
import rockhorn from "@/assets/images/wobblins/species/rockhorn.png";
import shadowimp from "@/assets/images/wobblins/species/shadowimp.png";
import skywing from "@/assets/images/wobblins/species/skywing.png";
import sproutling from "@/assets/images/wobblins/species/sproutling.png";
import stormclaw from "@/assets/images/wobblins/species/stormclaw.png";
import thornbeast from "@/assets/images/wobblins/species/thornbeast.png";
import thunderfang from "@/assets/images/wobblins/species/thunderfang.png";
import tideback from "@/assets/images/wobblins/species/tideback.png";
import toxibloom from "@/assets/images/wobblins/species/toxibloom.png";
import venomite from "@/assets/images/wobblins/species/venomite.png";
import voltkit from "@/assets/images/wobblins/species/voltkit.png";
import zephyra from "@/assets/images/wobblins/species/zephyra.png";

/**
 * Illustrated portraits for a species, keyed by `wobblin_species.name`.
 * Full coverage: all 30 species across the 10 evolution lines (3 stages
 * each) have art. Anything not in this map falls back to the
 * icon-in-circle placeholder used everywhere else (`ELEMENT_ICON`).
 */
export const SPECIES_ART: Record<string, number> = {
  // Fire
  Emberling: emberling,
  Flamefox: flamefox,
  Infernodrake: infernodrake,
  // Water
  Aquabub: aquabub,
  Tideback: tideback,
  "Ocean Titan": oceanTitan,
  // Grass
  Sproutling: sproutling,
  Thornbeast: thornbeast,
  "Ancient Treant": ancientTreant,
  // Thunder
  Voltkit: voltkit,
  Stormclaw: stormclaw,
  Thunderfang: thunderfang,
  // Dark
  Shadowimp: shadowimp,
  Nightfiend: nightfiend,
  "Abyss Lord": abyssLord,
  // Ice
  Frostling: frostling,
  "Glacier Wolf": glacierWolf,
  "Arctic Fenrir": arcticFenrir,
  // Rock
  Pebblit: pebblit,
  Rockhorn: rockhorn,
  "Mountain Colossus": mountainColossus,
  // Wind
  Zephyra: zephyra,
  Skywing: skywing,
  "Celestial Phoenix": celestialPhoenix,
  // Light
  Lumina: lumina,
  "Radiant Sprite": radiantSprite,
  "Astral Guardian": astralGuardian,
  // Poison
  Venomite: venomite,
  Toxibloom: toxibloom,
  "Plague Hydra": plagueHydra,
};
