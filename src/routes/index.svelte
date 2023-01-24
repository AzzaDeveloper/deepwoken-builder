<script>
	Number.prototype.clamp = function(min, max) {
  		return Math.min(Math.max(this, min), max);
	};
	//
	import { env } from '$env/dynamic/public';
	import { page } from '$app/stores';
	import { tooltip } from "../lib/tooltip";
	//
	import { initializeApp, getApps, getApp} from "firebase/app"
	import { getFirestore, collection, doc, setDoc, getDoc, getDocs} from "firebase/firestore"
	import { firebaseConfig } from "../lib/firebaseConfig"
	//
	const firebaseApp = initializeApp(firebaseConfig);
 	const db = getFirestore(firebaseApp);
	//
	let points = 327;
	let stats = {
			basic: {
			"Strength": 0,
			"Fortitude": 0,
			"Agility": 0,
			"Intelligence": 0,
			"Willpower": 0,
			"Charisma": 0,
		},
		weapon: {
			"Light Wep.": 0,
			"Medium Wep." : 0,
			"Heavy Wep." : 0
		},
		elem: {
			"Flamecharm": 0,
			"Frostdraw": 0,
			"Galebreath": 0,
			"Thundercall": 0,
			"Shadowcast": 0
		}
	}
	let currentPower = "P1";
	// Build info
	let obtainables = {
		talents: {
			Advanced: {},
			Rare: {},
			Common: {},
		},
		mantras: {combat:[], mobility:[], support:[]}
	}
	let baseMantraSlots = {
		combat: 3,
		mobility: 1,
		support: 1,
		wildcard: 1
	}
	let mantraSlots = {
		combat: 3,
		mobility: 1,
		support: 1,
		wildcard: 1
	}
	let takenTalents = {};
	let takenTalentsCount = 0;
	//
	let buildInfo = {
		name: "",
		desc: "",
		oath: "",
		murmur: ""
	}
	let mantras = {combat: [], mobility: [], support: []};
	//
	let oaths = ["Oathless", "Blindseer", "Visionshaper", "Starkindred", "Arcwarder", "Linkstrider", "Jetstriker", "Dawnwalker", "Contractor"];
	let oathsInfo = {
		Oathless: {
			slots: {wildcard: 2},
			mantras: {}
		},
		Blindseer: {
			slots: {wildcard: 1, support: 1},
			mantras: {combat: ["Tranquil Circle", "Sightless Beam"], support: ["Mindsoothe"]}
		},
		Visionshaper: {
			slots: {combat: 2, support: 1},
			mantras: {combat: ["Illusory Servants", "Illusionary Counter"], support: ["Illusionary Realm"]}
		},
		Starkindred: {
			slots: {combat: 2},
			mantras: {combat: ["Ascension", "Sinister Halo", "Celestial Assault"]}
		},
		Arcwarder: {
			slots: {wildcard: 1, combat: 2},
			mantras: {combat: ["Arc Beam", "Arc Wave"]}
		},
		Jetstriker: {
			slots: {wildcard: 1, mobility: 1},
			mantras: {}
		},
		Linkstrider: {
			slots: {wildcard: 1, support: 2},
			mantras: {support: ["Symbiotic Link", "Symbiotic Sustain", "Symbiotic Leech"]}
		},
		Dawnwalker: {
			slots: {combat: 2},
			mantras: {combat: ["Blinding Dawn ★★★", "Radiant Kick ★★★"]}
		},
		Contractor: {
			slots: {combat: 2},
			mantras: {combat: ["Judgement", "Lord's Slice", "Equalizer"]}
		}
	}
	let murmurs = ["Ardour", "Tacet", "Rhythm"];
	//
	let categoryBlacklist = [
		"Innate",
		"Murmur",
		"Sovereign of Slaughter",
		"Angler",
		"Shipwright",
		"Deepwoken",
		"Visionshaper",
	]
	let talentBlacklist = [
		"Termite", "Blinded", "Mark of the Lone Warrior", "Survival Kit"
	]
	// Search bar
	let search = "";
	function updateSearch(ev) {
		search = ev.target.value;
		updateTalents();
	}
	// Function to make sure no more than 1 tooltips are seen at any point
	function checkTooltips() {
		let tooltips = document.querySelectorAll("[tooltip=\"true\"]");
		if (tooltips.length > 1) tooltips[0].remove();	
	}
	function removeTooltip() {
		let tooltips = document.querySelectorAll("[tooltip=\"true\"]");
		tooltips[0].remove();
	}
	//
	function updateTalents() {
		let tempObs = obtainables.talents;
		obtainables.talents = {
			Advanced: {},
			Rare: {},
			Common: {},
		}
		// Filter out talents
		talentsCount = 0;
		talents.map((talent) => {
			talent.new = true;
			// Check for reqs
			if (talent.reqs != "None") {
				if (!talent.multipleReqs) {
					for (let req in talent.reqs) {
						for (let statType in stats) {
							if (stats[statType][req] == undefined) {
								continue;
							} else if (Number(stats[statType][req]) < talent.reqs[req]) {
								return;
							}
						}
					}
				} else {
					let pass = false;
					for (let req in talent.reqs) {
						for (let statType in stats) {
							if (stats[statType][req] == undefined) {
								continue;
							} else if (Number(stats[statType][req]) >= talent.reqs[req]) {
								pass = true
							}
						}
					}
					if (!pass) return;
				}
			}
			// See if talent already exists
			for (let rarity in tempObs) {
				for (let category in tempObs[rarity]) {
					tempObs[rarity][category].map(oldTalent => {
						if (talent.name == oldTalent.name) {
							talent.new = false;
						}
					})
				}
			}
			// Search bar
			console.log(search);
			//console.log(`Talent check passed. Adding to `)
			if (talent.name.toLowerCase().includes(search) || talent.category.toLowerCase().includes(search)) {
				if (obtainables.talents[talent.rarity][talent.category] == undefined) obtainables.talents[talent.rarity][talent.category] = [];
				obtainables.talents[talent.rarity][talent.category].push(talent);
				talentsCount++;
			}		
			//
			updateTalentStats();
		})
	}
	//
	let talentStats = {};
	function getTalent(category, talent, taking) {
		if (takenTalents[category] == undefined) takenTalents[category] = [];
		let foundTalent = false; let talentIndex = 0;
		takenTalents[category].map((takenTalent, i) => {if (takenTalent.name == talent.name) {foundTalent = true; talentIndex = i}});
		if (taking) {
			if (!foundTalent) {
				takenTalents[category].push(talent);
				takenTalentsCount++;
			}
		} else {
			takenTalents[category].splice(talentIndex, 1)
			if (takenTalents[category].length == 0) {
				delete takenTalents[category];
			}
			takenTalentsCount--;
		}
		takenTalents = takenTalents;
		updateTalentStats();
		removeTooltip();
	}
	function updateTalentStats() {
		// Calculate stats
		talentStats = {};
		for (let category in takenTalents) {
			takenTalents[category].map(talent => {
				if (talent.stats != "None") {
				// add card stats together
					for (let stat in talent.stats) {
						if (talentStats[stat] == undefined) talentStats[stat] = 0;
						talentStats[stat] += talent.stats[stat];
					}
				}
			})
		}
	}
	function updateActualStats(noUpdateMantra) {
		// Calculate points to deduct
		let investmentPoints = 327;
		let totalPoints = 0;
		for (let statType in stats) {
			for (let stat in stats[statType]) {
				totalPoints += stats[statType][stat];
			}
		}
		// Adding a point to investment points if player unlocked more elements
		let unlocked = false;
		for (let stat in stats.elem) {
			if (unlocked && stats.elem[stat] > 0) {investmentPoints++};
			if (stats.elem[stat] >= 1) {unlocked = true};
		}
		// Apply deduction from investment points
		points = investmentPoints - totalPoints;
		// Calculate powers
		currentPower = `P${(Math.floor((totalPoints - 27 + 15) / 15)).clamp(1, 20)}`
		updateTalents();
		if (!noUpdateMantra) updateMantras();
	}
	//
	function updateStats(ev) {
		let statName = ev.target.getAttribute("statName");
		let statType = ev.target.getAttribute("statType");
		if (statType == "basic") {
			if (ev.target.value >= 102) {
				ev.target.value = 102;
			} else if (ev.target.value <= 0) {
				ev.target.value = 0;
			}
		} else if (ev.target.value >= 100) {
			ev.target.value = 100;
		} else if (ev.target.value <= 0) {
			ev.target.value = 0;
		}
		// Failsafe
		var change = ev.target.value - stats[statType][statName];
		if (points - change < 0) {
			ev.target.value = ev.target.value - change;
		}
		stats[statType][statName] = parseInt(ev.target.value);
		updateActualStats();
	}
	// Talents
	let talents = [
    {
      "name": "Hard Read",
      "category": "Tactician",
      "desc": "\nHitting your opponent during a feint will cause them to be dazed. \n",
      "stats": {
        "Ether": 4
      },
      "rarity": "Common",
      "reqs": {
        "Intelligence": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Target Switch",
      "category": "Tactician",
      "desc": "\nParrying an opponent then hitting someone else makes your next Mantra free. \n",
      "stats": {
        "Ether": 4
      },
      "rarity": "Common",
      "reqs": {
        "Intelligence": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Master Chef",
      "category": "Tavernkeep",
      "desc": "\nBuffs applied by food you cook now have their buffs amplified by +30%.\n",
      "stats": {
        "Elemental Intensity +2 Ether": 5
      },
      "rarity": "Common",
      "reqs": {
        "50": "Cook",
        "Intelligence": "25",
        "Charisma": "15"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Artisan Chef",
      "category": "Tavernkeep",
      "desc": "\nThe food you cook now becomes Artisan food, increasing it's hunger and thirst gained by +25%.\n",
      "stats": {
        "Elemental Intensity +4 Ether": 3
      },
      "rarity": "Common",
      "reqs": {
        "50": "Cook",
        "Intelligence": "25",
        "Charisma": "15"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Explosive Finish",
      "category": "The Demon Blade",
      "desc": "\nIf an enemy is on fire when you flourish, blast them away with a fire blast.\n",
      "stats": {
        "Elemental Intensity ": 2
      },
      "rarity": "Common",
      "reqs": {
        "Flamecharm": "50"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Flaming Flourish",
      "category": "The Demon Blade",
      "desc": "\nSet enemies on fire when you flourish them. \n",
      "stats": {
        "Elemental Intensity": 2,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Flamecharm": "25"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Emperor Flame",
      "category": "The Emperor's Blade",
      "desc": "\nAbsorb fire produced by you, once you reach 5 stacks your next attack will be an automatic explosive finish flourish. \n",
      "stats": {
        "Elemental Intensity": 4,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Flamecharm": "75"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Agitating Spark"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Last Second Negotiations",
      "category": "The Negotiator",
      "desc": "\nMost enemies will hesitate a moment longer before executing you.\n",
      "stats": {
        "Ether": 1
      },
      "rarity": "Common",
      "reqs": {
        "Charisma": "70"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Pickpocket",
      "category": "Thief",
      "desc": "\nGain the ability to pickpocket by pressing \"N\" on a downed person. \n",
      "stats": {
        "Ether": 4,
        "Passive Agility": 2
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "5",
        "Charisma": "5"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Cap Artist",
      "category": "Thief",
      "desc": "\nPressing [R] while crouching allows you to fake being dead it's cancelled when hit or when toggling [R] again.\n",
      "stats": {
        "Ether": 4,
        "Passive Agility": 2
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "15",
        "Charisma": "5"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Master Thief",
      "category": "Thief",
      "desc": "\nGain more notes when mugging a player. \n",
      "stats": {
        "Ether": 2
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "5",
        "Charisma": "5"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Pickpocket"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Gathering Electricity",
      "category": "Thunderblade",
      "desc": "\n[Medium Weapons] Reaching 10 Static Blade charges will now consume the stacks and apply a lightning buff to your blade. 60 second cooldown. \n",
      "stats": {
        "Carry Load": 10,
        "Elemental Intensity": 4,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Medium Wep.": "30",
        "Thundercall": "60"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Static Blade"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Overcharge",
      "category": "Thunderblade",
      "desc": "\nYour next dash after activating Static Blade is enhanced by lightning. \n",
      "stats": {
        "Elemental Intensity": 2,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Med": "30",
        "Thundercall": "50"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Static Blade"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Static Blade",
      "category": "Thunderblade",
      "desc": "\n[Medium Weapons] Hitting blocks, blocking or parrying hits will now generate an electric charge in your blade, granting a small speed buff. Charges can stack up to 10 times. \n",
      "stats": {
        "Elemental Intensity": 2
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "20",
        "Thundercall": "40",
        "Medium Wep.": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Discharge",
      "category": "Thunder Brawler",
      "desc": "\n[Light Weapons] On 5th successful attack you will discharge static dealing lightning damage to those nearby. \n",
      "stats": {
        "Carry Load": 7,
        "Elemental Intensity": 2,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Thundercall": "20",
        "Light Wep.": "20",
        "undefined": "Fists"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Volt Kick",
      "category": "Thunder Brawler",
      "desc": "\nAfter landing a lightning kick, press [F] to followup on your opponent with a less potent kick. \n",
      "stats": {
        "Carry Load": 7,
        "Elemental Intensity": 2
      },
      "rarity": "Common",
      "reqs": {
        "Thundercall": "20",
        "Kick": "Thunder"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Jolt Cast",
      "category": "Thunder Caster",
      "desc": "\nEvery 3 perfect casted lightning mantra builds a stack at 3 stacks your next lightning mantra is instant cast. \n",
      "stats": {
        "Carry Load": 7,
        "Elemental Intensity": 2
      },
      "rarity": "Common",
      "reqs": {
        "Thundercall": "50"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Rain of Static",
      "category": "Thunder Caster",
      "desc": "\nAfter successfully casting lightning impact, strike down countless thunder at those below. In return your Lightning Impact will require more time to cast.\n",
      "stats": {
        "Carry Load": 7,
        "Elemental Intensity": 2
      },
      "rarity": "Common",
      "reqs": {
        "Thundercall": "20"
      },
      "extraReqs": [
        {
          "type": "Mantra",
          "content": "Lightning Impact"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Mantra Req.",
      "new": true
    },
    {
      "name": "Thundercaller",
      "category": "Thundercaller",
      "desc": "\nGrants you the ability to command Lightning as a Thundercaller.\n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Thundercall": "1"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Adept Thundercaller",
      "category": "Thundercaller",
      "desc": "\nYou can now obtain 1-star Thundercaller mantras.\n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Thundercall": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Expert Thundercaller",
      "category": "Thundercaller",
      "desc": "\nYou can now obtain 2-star Thundercaller mantras.\n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Thundercall": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Master Thundercaller",
      "category": "Thundercaller",
      "desc": "\nYou can now obtain 3-star Thundercaller mantras.\n",
      "stats": {
        "Health": 5
      },
      "rarity": "Common",
      "reqs": {
        "Thundercall": "50"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Capacitor",
      "category": "Thundercaller",
      "desc": "\nBodies of knocked enemies will be charged with electricity which will stun people who attempt to carry them. \n",
      "stats": {
        "Elemental Intensity": 4
      },
      "rarity": "Common",
      "reqs": {
        "Thundercall": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Discovery of Fire",
      "category": "Thundercaller",
      "desc": "\nFlints and Flamecharm are for simpletons. \n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Thundercall": "50"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Kickstart",
      "category": "Thundercaller",
      "desc": "\nUse your lightning to resurrect a knocked player.\n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Fortitude": "50",
        "Thundercall": "50"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Shocking Finish",
      "category": "Thundercaller",
      "desc": "\nFollowing a flourish up with a lightning beam causes it to be casted instantly.\n",
      "stats": {
        "Elemental Intensity": 3,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Thundercall": "20",
        "Beam": "Lightning"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Static Flash Clone",
      "category": "Thundercaller",
      "desc": "\nWhen using lightning clones you disappear leaving behind a static clone for a short duration. \n",
      "stats": {
        "Elemental Intensity": 3
      },
      "rarity": "Common",
      "reqs": {
        "Thundercall": "20",
        "Agility": "30"
      },
      "extraReqs": [
        {
          "type": "Mantra",
          "content": "Lightning Clones"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Mantra Req.",
      "new": true
    },
    {
      "name": "Stratoshock",
      "category": "Thundercaller",
      "desc": "\nYour lightning deals more damage when in the rain. \n",
      "stats": {
        "Elemental Intensity": 4,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Thundercall": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Blighted Song",
      "category": "Miscellaneous",
      "desc": "\nAttaching your Shadow Chains to an enemy disables both you and your's opponent's ability to cast Mantras. You take reduced damage from non-chained enemies while this is active.\n",
      "stats": {
        "": null
      },
      "rarity": "Common",
      "reqs": {
        "Shadowcast": "20"
      },
      "extraReqs": [
        {
          "type": "Mantra",
          "content": "Shadow Chains"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Mantra Req.",
      "new": true
    },
    {
      "name": "Soundness of Mind",
      "category": "Undying Ember",
      "desc": "\nStanding close to your graceful flame will slowly restore sanity for others in the area. \n",
      "stats": {
        "Elemental Intensity": 1
      },
      "rarity": "Common",
      "reqs": {
        "Willpower": "40",
        "Flamecharm": "40"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Undying Flame"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Maestro's Blade",
      "category": "Vigil of Winds",
      "desc": "\nInhaling a spell will cause the wind to be applied to your melee attack.\n",
      "stats": {
        "Elemental Intensity": 4
      },
      "rarity": "Common",
      "reqs": {
        "Galebreath": "75"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Bear Trap",
      "category": "Vigil Swordsman",
      "desc": "\nLanding a hit with your critical makes your opponent unable to jump for a duration. Also slows your opponent. \n",
      "stats": {
        "Passive Agility": 1
      },
      "rarity": "Common",
      "reqs": {
        "Strength": "20",
        "Agility": "25"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Blade Dancer",
      "category": "Vigil Swordsman",
      "desc": "\nLanding a hit removes your roll cooldown. \n",
      "stats": {
        "Passive Agility": 1
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "25"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Spinning Swordsman",
      "category": "Vigil Swordsman",
      "desc": "\nRunning attacks do extra damage when you have a speed boost. \n",
      "stats": {
        "Passive Agility": 1
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Command: Fight",
      "category": "Vow of Mastery",
      "desc": "\nCommand your servants to fight for their master, granting them enhanced stats for a duration. \n",
      "stats": {
        "Ether": 4,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Charisma": "35"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Vow of Mastery"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Command: Leech",
      "category": "Vow of Mastery",
      "desc": "\nConjure the ether of your vow into essence and transfer it to yourself. \n",
      "stats": {
        "Ether": 4,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Charisma": "20"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Vow of Mastery"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Command: Run",
      "category": "Vow of Mastery",
      "desc": "\nCommand your servant to run with all their might. \n",
      "stats": {
        "Ether": 4,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Charisma": "25"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Vow of Mastery"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Vow of Mastery",
      "category": "Vow of Mastery",
      "desc": "\nThe Vow of Mastery grants the Master the power to command their Subject. To initiate a vow you must ask the other player if they'd like to make the vow. \n",
      "stats": {
        "Ether": 1
      },
      "rarity": "Common",
      "reqs": {
        "Charisma": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Conditioned Swimmer",
      "category": "Waterborne",
      "desc": "\nYou lose less hunger and thirst while swimming. \n",
      "stats": {
        "Passive Agility": 1
      },
      "rarity": "Common",
      "reqs": {
        "undefined": "--"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Brutal Momentum",
      "category": "Weapon Master",
      "desc": "\n[Greatswords/Greathammers] Successfully dodging will give you hyperarmour on your next swing. \n",
      "stats": {
        "Passive Agility": 1
      },
      "rarity": "Common",
      "reqs": {
        "Heavy Wep.": "50"
      },
      "extraReqs": [
        {
          "type": "Equipped",
          "content": "Greatswords/Greathammers"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Equipped: Greatswords/Greathammers",
      "new": true
    },
    {
      "name": "Finishing Touch",
      "category": "Weapon Master",
      "desc": "\n[Daggers] Instantly execute enemies finished with the critical attack of your dagger. \n",
      "stats": {
        "Passive Agility": 2,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "50",
        "Light Wep.": "40"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Aerial Spin"
        },
        {
          "type": "Equipped",
          "content": "Daggers"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req. Equipped: Daggers",
      "new": true
    },
    {
      "name": "Lethal Precision",
      "category": "Weapon Master",
      "desc": "\n[Light Weapons] When you flourish an enemy much weaker than you, you kill them instantly. \n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Weapon": "75"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Matador",
      "category": "Weapon Master",
      "desc": "\nDeal +20% more damage to enemies with hyperarmor. \n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Strength": "20",
        "Agility": "5"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "One Handed Training",
      "category": "Weapon Master",
      "desc": "\n[Heavy Weapons] You can now wield heavy weapons one handed. \n",
      "stats": {
        "Health ": 3
      },
      "rarity": "Common",
      "reqs": {
        "Heavy Wep.": "40"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Successive Throw",
      "category": "Weapon Master",
      "desc": "\n[Dagger] When you successfully flourish an enemy, you throw out a dagger afterwards. \n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Light Wep.": "35"
      },
      "extraReqs": [
        {
          "type": "Equipped",
          "content": "Daggers"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Equipped: Daggers",
      "new": true
    },
    {
      "name": "Warrior's Swing",
      "category": "Weapon Master",
      "desc": "\n[Heavy Weapons] Reduces incoming damage if hit during the heavy swing hyper armor. \n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Heavy Wep.": "40"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Haunted Gale",
      "category": "Whisper",
      "desc": "\nEvery 3 hits landed by perfectly casted Galebreathe mantras will cause the target to be quickly struck by a phantom of wind. \n",
      "stats": {
        "Elemental Intensity": 5,
        "Health ": 3
      },
      "rarity": "Common",
      "reqs": {
        "Galebreath": "40"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Anxious Guard",
      "category": "Miscellaneous",
      "desc": "\nHitting an enemies block causes their parry window to be lowered for a short duration. \n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {},
      "extraReqs": [],
      "multipleReqs": false,
      "power": "30",
      "note": " P30",
      "new": true
    },
    {
      "name": "Armor Conserver",
      "category": "Miscellaneous",
      "desc": "\nYou lose 15% less armor when hit. \n",
      "stats": {
        "Ether": 4
      },
      "rarity": "Common",
      "reqs": {},
      "extraReqs": [],
      "multipleReqs": false,
      "power": "25",
      "note": " P25",
      "new": true
    },
    {
      "name": "Full Reset",
      "category": "Miscellaneous",
      "desc": "\nKnocking an enemy resets your resonance cooldowns. This effect has a 60 second cooldown.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Resonance": "Extra:"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": "50",
      "note": " P50",
      "new": true
    },
    {
      "name": "Gourmand",
      "category": "Miscellaneous",
      "desc": "\nYour hunger and thirst gain from eating increased. \n",
      "stats": {
        "Carry Load": 2,
        "Posture": 1
      },
      "rarity": "Common",
      "reqs": {},
      "extraReqs": [],
      "multipleReqs": false,
      "power": "15",
      "note": " P15",
      "new": true
    },
    {
      "name": "Hardened Nerves",
      "category": "Miscellaneous",
      "desc": "\nSlightly increases posture. \n",
      "stats": {
        "Posture": 2
      },
      "rarity": "Common",
      "reqs": {
        "undefined": "--"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Lightweight",
      "category": "Miscellaneous",
      "desc": "\nMove faster when your armor runs out of durability. \n",
      "stats": {
        "Passive Agility": 3
      },
      "rarity": "Common",
      "reqs": {},
      "extraReqs": [],
      "multipleReqs": false,
      "power": "15",
      "note": " P15",
      "new": true
    },
    {
      "name": "Martyr",
      "category": "Miscellaneous",
      "desc": "\nEnemies gain less health and posture when they knock you. \n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {},
      "extraReqs": [],
      "multipleReqs": false,
      "power": "10",
      "note": " P10",
      "new": true
    },
    {
      "name": "Polite Awakening",
      "category": "Miscellaneous",
      "desc": "\nRecover 15% of your max health after getting up from being knocked. \n",
      "stats": {
        "Passive Agility": 1
      },
      "rarity": "Common",
      "reqs": {
        "undefined": "--"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Ready or Not",
      "category": "Miscellaneous",
      "desc": "\nThe first attack you get struck by while out of combat deals half of its damage. \n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Fortitude": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Replenishing Knockout",
      "category": "Miscellaneous",
      "desc": "\nGain more health and posture when knocking enemies.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {},
      "extraReqs": [],
      "multipleReqs": false,
      "power": "10",
      "note": " P10",
      "new": true
    },
    {
      "name": "Blood Frenzy",
      "category": "Acrobat",
      "desc": "\nYour speed boost from killing is increased and duration is doubled, but will only work on players.\n",
      "stats": {
        "Passive Agility": 1
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "5"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Time to Go"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Graceful Landing",
      "category": "Acrobat",
      "desc": "\nYou easily brush off shorter falls, taking no fall damage. \n",
      "stats": {
        "Passive Agility": 1
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "25"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Kick Off",
      "category": "Acrobat",
      "desc": "\nYour first wall jump will always send you higher than normal. Gain a speed boost after wall jumping over a wall.\n",
      "stats": {
        "Passive Agility": 6
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "15"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Steady Footing",
      "category": "Acrobat",
      "desc": "\nYou're much more resistant to being pushed around. You no longer slide on ice.\n",
      "stats": {
        "Carry Load": 9,
        "Passive Agility": 2
      },
      "rarity": "Common",
      "reqs": {
        "Strength": "20",
        "Agility": "10"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Time To Go",
      "category": "Acrobat",
      "desc": "\nTaking a life grants a speed boost for 12 seconds.\n",
      "stats": {
        "Passive Agility": 1
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "5"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Ether Absorption",
      "category": "Adept Caster",
      "desc": "\nReceive Ether back when inflicted with damage from Mantras. \n",
      "stats": {
        "Carry Load": 7,
        "Elemental Intensity": 2
      },
      "rarity": "Common",
      "reqs": {
        "Intelligence": "15"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Ether Conduit",
      "category": "Adept Caster",
      "desc": "\nSuccessful hits with your mantra inspire you stacking up to 3 causing your mantra to deal more damage for a set duration.\n",
      "stats": {
        "Carry Load": 7,
        "Elemental Intensity": 2
      },
      "rarity": "Common",
      "reqs": {
        "Intelligence": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Gale Trap",
      "category": "Aeromancer",
      "desc": "\nKnocking a player tags them with a wind trap, causing anyone to pick up that body to get sent flying. However, if you pick up the body you gain a speed boost for 20 seconds.\n",
      "stats": {
        "Elemental Intensity": 4
      },
      "rarity": "Common",
      "reqs": {
        "Galebreath": "50"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Aeronade",
      "category": "Aeromancy",
      "desc": "\nYour trap automatically detonates on contact with an object.\n",
      "stats": {
        "Passive Agility": 2,
        "Elemental Intensity": 5
      },
      "rarity": "Common",
      "reqs": {
        "Galebreath": "10"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Drifting Winds",
      "category": "Aeromancy",
      "desc": "\nEnemies hit by your wind mantra are winded, having their attack speed lowered for a short duration.\n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Galebreath": "25"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Gale Coil",
      "category": "Aeromancy",
      "desc": "\nYour suffocates last twice as long.\n",
      "stats": {
        "Passive Agility": 2,
        "Elemental Intensity": 5
      },
      "rarity": "Common",
      "reqs": {
        "Strength": "30",
        "Galebreath": "40"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Gale Coil"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Suffocating Impact",
      "category": "Aeromancy",
      "desc": "\n\nWhen flourishing enemies into walls they are suffocated and winded for a short duration.\n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Strength": "30",
        "Galebreath": "40"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Drifting Winds"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Vacuum Punch",
      "category": "Aeromancy",
      "desc": "\nYour gale punch pulls enemies in before you hit them\n\n",
      "stats": {
        "Passive Agility": 2,
        "Elemental Intensity": 5,
        "Health": 2
      },
      "rarity": "Common",
      "reqs": {
        "Galebreath": "20"
      },
      "extraReqs": [
        {
          "type": "Mantra",
          "content": "Gale Punch"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Mantra Req.",
      "new": true
    },
    {
      "name": "Apothecary",
      "category": "Alchemist",
      "desc": "\nPotions you prepare will have amplified positive effects when consumed. \n",
      "stats": {
        "Ether": 4,
        "Reservoir": 7,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Intelligence": "10",
        "A": "Make"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Exterminator",
      "category": "Alchemist",
      "desc": "\nPotions you create will have amplified negative effects when thrown.\n",
      "stats": {
        "Ether": 4,
        "Reservoir": 5
      },
      "rarity": "Common",
      "reqs": {
        "Intelligence": "25",
        "A": "Make"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Wild Alchemy",
      "category": "Alchemist",
      "desc": "\nPotions you prepare will have a chance to have doubled ingredients when mixed.\n",
      "stats": {
        "Ether": 4,
        "Reservoir": 2
      },
      "rarity": "Common",
      "reqs": {
        "Intelligence": "25",
        "A": "Make"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Endurance Runner",
      "category": "Alley Cat",
      "desc": "\nEven when things look dire, you still have it in you to keep your legs moving.\n",
      "stats": {
        "Health": 3,
        "Passive Agility": 2
      },
      "rarity": "Common",
      "reqs": {
        "Fortitude": "25",
        "Agility": "25"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Lowstride",
      "category": "Alley Cat",
      "desc": "\nYou suffer much less speed decrease from crouching.\n",
      "stats": {
        "Passive Agility": 1
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "10"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Scaredy Cat",
      "category": "Alley Cat",
      "desc": "\nWhen enemies initiate a fight first, you gain a speed boost.\n",
      "stats": {
        "Health": 3,
        "Passive Agility": 2
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "5"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Flame Within",
      "category": "Amoran Seeker",
      "desc": "\nAn application of Pleeksty's concept of the inner flame, also known as the soul of man. Set yourself ablaze to gain extra Strength and Speed.\n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Flamecharm": "25"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Last Laugh",
      "category": "Amoran Seeker",
      "desc": "\nGain the ability to incinerate yourself when down.\n",
      "stats": {
        "Elemental Intensity": 5,
        "Health": 1
      },
      "rarity": "Common",
      "reqs": {
        "Flamecharm": "1"
      },
      "extraReqs": [
        {
          "type": "Mantra",
          "content": "Flame Within"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Mantra Req.",
      "new": true
    },
    {
      "name": "Grand Feast",
      "category": "Apex Predator",
      "desc": "\nRegain reservoir and ether when gaining hunger from killing.\n",
      "stats": {
        "Passive Agility": 1
      },
      "rarity": "Common",
      "reqs": {
        "Willpower": "5",
        "Strength": "5"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Carnivore"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Sunken Predator",
      "category": "Apex Predator",
      "desc": "\nEnemies you hit in the water or the depths have their speed buffs nullified and are slowed.\n",
      "stats": {
        "Passive Agility": 1
      },
      "rarity": "Common",
      "reqs": {},
      "extraReqs": [],
      "multipleReqs": false,
      "power": "35",
      "note": " P35",
      "new": true
    },
    {
      "name": "Master Craftsman",
      "category": "Artisan",
      "desc": "\nYour skills alone substitute the need for a Craft Station.\n",
      "stats": {
        "Health": 5
      },
      "rarity": "Common",
      "reqs": {
        "Intelligence": "25"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Finesse",
      "category": "Assassin",
      "desc": "\nYou pull your weapons out silently.\n",
      "stats": {
        "Passive Agility": 3,
        "Health": 5
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "15"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Vital Point",
      "category": "Assassin",
      "desc": "\nAssassinating someone gives you 50% PEN for 5 seconds.\n",
      "stats": {
        "Passive Agility": 1
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "25"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Pitcher",
      "category": "Athlete",
      "desc": "\nYou can throw things further.\n",
      "stats": {
        "Carry Load": 3,
        "Passive Agility": 1,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Strength": "5",
        "Agility": "5"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Triathlete",
      "category": "Athlete",
      "desc": "\nYou swim faster in water.\n",
      "stats": {
        "Passive Agility": 2,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "undefined": "--"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Authority Intimidation",
      "category": "Authority Interrogator",
      "desc": "\nAll moves that apply electricity slow the opponent more. \n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Thundercall": "65"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": "30",
      "note": " P30",
      "new": true
    },
    {
      "name": "First Interrogation",
      "category": "Authority Interrogator",
      "desc": "\nElectrified attacks do 50% less posture damage to you. \n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Thundercall": "65",
        "Authority": "Talent:"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": "40",
      "note": " P40",
      "new": true
    },
    {
      "name": "Resolve Crusher",
      "category": "Authority Interrogator",
      "desc": "\nLightning moves now have a chance to apply \"Electrified\" to your opponent. Attacks from Electrified opponents are converted into Lightning damage, but will deal 10% less damage to you.\n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Thundercall": "65"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": "40",
      "note": " P40",
      "new": true
    },
    {
      "name": "Second Interrogation",
      "category": "Authority Interrogator",
      "desc": "\nElectrified attacks against you refill your Ether bar. \n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Thundercall": "65",
        "First": "Talent:"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": "40",
      "note": " P40",
      "new": true
    },
    {
      "name": "Third Interrogation",
      "category": "Authority Interrogator",
      "desc": "\nOpponents who are electrified do 50% less damage to you.\n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Thundercall": "65",
        "Second": "Talent:"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": "30",
      "note": " P30",
      "new": true
    },
    {
      "name": "Battle Tendency",
      "category": "Bastion",
      "desc": "\nYou can breathe more easily with +20% faster posture regen. \n",
      "stats": {
        "Posture": 1,
        "Sanity": 10
      },
      "rarity": "Common",
      "reqs": {
        "Fortitude": "15",
        "Willpower": "10"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Berserker",
      "category": "Bastion",
      "desc": "\nKnocking an enemy gives you 20% defense for 15 seconds.\n",
      "stats": {
        "Carry Load": 10
      },
      "rarity": "Common",
      "reqs": {
        "Fortitude": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Braced Collapse",
      "category": "Bastion",
      "desc": "\nAfter being block broken, the next attack to hit you deals reduced damage.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Fortitude": "25"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Firmly Planted",
      "category": "Bastion",
      "desc": "\nAll slow debuffs towards you are cut by 30%. \n",
      "stats": {
        "Health": 3,
        "Sanity": 5
      },
      "rarity": "Common",
      "reqs": {
        "Fortitude": "15",
        "Willpower": "15"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Perseverance",
      "category": "Bastion",
      "desc": "\nWhen knocked down, you get back up again more quickly.\n",
      "stats": {
        "Ether": 5,
        "Sanity": 5
      },
      "rarity": "Common",
      "reqs": {
        "Fortitude": "30",
        "Willpower": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Heavy Haul",
      "category": "Bastion",
      "desc": "\nEnemies who carry you move significantly slower. \n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Strength": "15",
        "Fortitude": "15"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Moving Fortress",
      "category": "Bastion",
      "desc": "\nBlocking no longer slows you down as much. \n",
      "stats": {
        "Posture": 1
      },
      "rarity": "Common",
      "reqs": {
        "Fortitude": "5"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Giantslayer",
      "category": "Beast Slayer",
      "desc": "\nDeal more damage to larger foes. \n",
      "stats": {
        "Health": 3,
        "Sanity": 7
      },
      "rarity": "Common",
      "reqs": {
        "Willpower": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Bruiser's Mixup",
      "category": "Brawler",
      "desc": "\nSwitching your Fist Style mid-fight makes your basic Fist attacks inflict bleed temporarily. \n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Light Wep.": "1"
      },
      "extraReqs": [
        {
          "type": "Equipped",
          "content": "Fists"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Equipped: Fists",
      "new": true
    },
    {
      "name": "Trained Fist",
      "category": "Brawler",
      "desc": "\nYou can now equip Cestus.\n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Light Wep.": "0"
      },
      "extraReqs": [
        {
          "type": "Equipped",
          "content": "Fists"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Equipped: Fists",
      "new": true
    },
    {
      "name": "Brazen Blow",
      "category": "Bruiser",
      "desc": "\n[Greataxes] Attacking an enemy slowed by your Greataxe grants you temporary hyperarmor (20 second cooldown).\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Heavy Wep.": "30"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Impairing Blow"
        },
        {
          "type": "Equipped",
          "content": "Greataxe"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req. Equipped: Greataxe",
      "new": true
    },
    {
      "name": "Impairing Blow",
      "category": "Bruiser",
      "desc": "\n[Greataxes] Basic attacks will slightly slow your enemy for 2 seconds. Running attacks will slightly slow your enemy for 3 seconds.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Heavy Wep.": "30"
      },
      "extraReqs": [
        {
          "type": "Equipped",
          "content": "Greataxe"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Equipped: Greataxe",
      "new": true
    },
    {
      "name": "Steady Nerves",
      "category": "Butterfly",
      "desc": "\nYou dance from toe to toe - successful dodges restore posture. \n",
      "stats": {
        "Carry Load\n+2 Passive Agility": 7
      },
      "rarity": "Common",
      "reqs": {
        "Strength": "15",
        "Agility": "40"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Swift Rebound",
      "category": "Butterfly",
      "desc": "\nMove faster after successfully dodging an attack.\n",
      "stats": {
        "Passive Agility": 1
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "15"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Underdog",
      "category": "Champion",
      "desc": "\nYou deal slightly more damage to those with higher HP than you.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Willpower": "50"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Lasting Charisma",
      "category": "Charm Caster",
      "desc": "\nEnemies charmed by your mantras are charmed longer\n",
      "stats": {
        "Ether": 4
      },
      "rarity": "Common",
      "reqs": {
        "Charisma": "55"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Charismatic Cast"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Chaotic Charm",
      "category": "Charm Caster",
      "desc": "\nWhen attacked at low health enemies deal less damage to you and more to anyone else.\n",
      "stats": {
        "Ether": 4
      },
      "rarity": "Common",
      "reqs": {
        "Charisma": "55"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Charismatic Cast"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Charismatic Cast",
      "category": "Charm Caster",
      "desc": "\nLanding mantras on enemies charms them reducing damage done to you.\n",
      "stats": {
        "Ether": 4
      },
      "rarity": "Common",
      "reqs": {
        "Charisma": "25"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Morale Booster",
      "category": "Charm Caster",
      "desc": "\nAllies recover twice as fast from being knocked when charmed by you. \n",
      "stats": {
        "Ether": 4
      },
      "rarity": "Common",
      "reqs": {
        "Charisma": "25"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Tough Love",
      "category": "Charm Caster",
      "desc": "Charm Caster\nTalent Description: \n---\nDeal more damage to players charmed by you.\n",
      "stats": {
        "Ether": 4
      },
      "rarity": "Common",
      "reqs": {
        "Charisma": "25"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Charismatic Cast"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Gale Leap",
      "category": "Cloudwalker",
      "desc": "\nJumping while sliding down a slope or off a cliff launches you forward. \n",
      "stats": {
        "Elemental Intensity": 1,
        "Health": 2
      },
      "rarity": "Common",
      "reqs": {
        "Galebreath": "25"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Harsh Response",
      "category": "Colossus",
      "desc": "\nEnemies receive less posture back when they parry your attacks. \n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Strength": "25"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Heavy Hitter",
      "category": "Colossus",
      "desc": "\nYour posture damage is increased by 20%.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Heavy Wep.": "25"
      },
      "extraReqs": [
        {
          "type": "Equipped",
          "content": "Any Heavy"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Equipped: Any Heavy",
      "new": true
    },
    {
      "name": "Decisive Blow",
      "category": "Critical Specialist",
      "desc": "\nDodging an attack increases your Knife's Journey critical chance by 30%.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Light Wep.": "30"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Knife's Journey"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Chilling Flourish",
      "category": "Cryomancer",
      "desc": "\nWhen flourishing an enemy, send them off with a trail of ice. \n",
      "stats": {
        "Elemental Intensity": 4,
        "Health": 2
      },
      "rarity": "Common",
      "reqs": {
        "Frostdraw": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Condensation Drip",
      "category": "Cryomancer",
      "desc": "\nPassively collect condensation from the air, greatly reducing your thirst.\n",
      "stats": {
        "Ether": 4,
        "Elemental Intensity": 2
      },
      "rarity": "Common",
      "reqs": {
        "Intelligence": "20",
        "Frostdraw": "15"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Cool Head",
      "category": "Cryomancer",
      "desc": "\nIf set on fire while on ice, immediately put it out and enter a state of chill. During this state you cannot be lit on fire. \n",
      "stats": {
        "Elemental Intensity": 2,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Frostdraw": "15"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Cryostasis",
      "category": "Cryoni",
      "desc": "\nWhen block broken, fragile freeze yourself, negating the damage of the next attack. \n",
      "stats": {
        "Elemental Intensity": 3,
        "Health": 1
      },
      "rarity": "Common",
      "reqs": {
        "Frostdraw": "50"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Fragile Freeze",
      "category": "Cryoni",
      "desc": "\nYour ice Mantras will freeze opponents upon blockbreaking them.\n",
      "stats": {
        "Elemental Intensity": 3
      },
      "rarity": "Common",
      "reqs": {
        "Frostdraw": "60"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Rude Awakening",
      "category": "Cryoni",
      "desc": "\nWhen in Cryostasis inflict frost damage to the enemy who hit you.\n",
      "stats": {
        "Elemental Intensity": 3,
        "Health": 2
      },
      "rarity": "Common",
      "reqs": {
        "Frostdraw": "50"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Cryostasis"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Assassin",
      "category": "Cutthroat",
      "desc": "\nAssassination damage now scales with level.\n",
      "stats": {
        "Passive Agility": 2,
        "Health": 2
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Bloodthirsty",
      "category": "Cutthroat",
      "desc": "\nGain a speed boost after causing an opponent heavy blood loss.\n",
      "stats": {
        "Passive Agility": 1,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "40"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Deep Wound",
      "category": "Cutthroat",
      "desc": "\nAssassinating a target with a dagger applies anti-heal for 20 seconds.\n",
      "stats": {
        "Health": 2
      },
      "rarity": "Common",
      "reqs": {
        "Light Wep.": "15"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Hidden Blade",
      "category": "Cutthroat",
      "desc": "\nAssassinations now leave enemies on the ground longer.\n",
      "stats": {
        "Passive Agility": 2,
        "Health": 2
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "In A Hurry",
      "category": "Cutthroat",
      "desc": "\nGrip players faster whenever you have a speed boost ![active.]()\n",
      "stats": {
        "Passive Agility": 1,
        "Health": 2
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Precise Swing",
      "category": "Duelist",
      "desc": "\nAfter landing a critical, your next light attack will chip past your opponent's block.\n",
      "stats": {
        "Carry Load": 9,
        "Passive Agility": 1,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Strength": "25",
        "Agility": "15"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Dark God",
      "category": "Darksiphon",
      "desc": "\nIf a shadowcast mantra would drain your opponent's Ether to 0, drain from their reservoir instead. \n",
      "stats": {
        "Elemental Intensity": 1,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Shadowcast": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Dark Hours",
      "category": "Darksiphon",
      "desc": "\nYour Shadowcast Mantras deal more damage at night. \n",
      "stats": {
        "Elemental Intensity": 4,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Shadowcast": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Dark Synergy",
      "category": "Darksiphon",
      "desc": "\nEngulf your enemy in shadows when flourishing them. \n",
      "stats": {
        "Elemental Intensity": 1,
        "Health": 1
      },
      "rarity": "Common",
      "reqs": {
        "Shadowcast": "45"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Devour",
      "category": "Darksiphon",
      "desc": "\nStealing enough ether to fill your bar now stores the extras in your reserves.\n",
      "stats": {
        "Elemental Intensity": 3,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Shadowcast": "40"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Overwhelming Drain",
      "category": "Darksiphon",
      "desc": "\nIf multiple enemies are hit by your Shadow Eruption, they are dazed.\n",
      "stats": {
        "Ether": 4,
        "Health": 1,
        "Reservoir": 7
      },
      "rarity": "Common",
      "reqs": {
        "Shadowcast": "20"
      },
      "extraReqs": [
        {
          "type": "Mantra"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Mantra Req.",
      "new": true
    },
    {
      "name": "Shadow Overflow",
      "category": "Darksiphon",
      "desc": "\nExtra ether stolen with mantras are exerted as dark energy, damaging and absorbing ether from those nearby.\n",
      "stats": {
        "Elemental Intensity": 3,
        "Health": 1
      },
      "rarity": "Common",
      "reqs": {
        "Shadowcast": "50"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Dark God"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Energy Siphon",
      "category": "Death Speaker",
      "desc": "\nYour singularity now pulls ether from the extra players affected.\n",
      "stats": {
        "Elemental Intensity": 1,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Shadowcast": "50"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Concussive Force",
      "category": "Duelist",
      "desc": "\nEnemies you knocked remain down longer than usual.\n",
      "stats": {
        "Health": 3,
        "Carry Load": 9
      },
      "rarity": "Common",
      "reqs": {
        "Strength": "15"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Duelist Dance",
      "category": "Duelist",
      "desc": "\nParrying opponents gives you back 25% more posture back.\n",
      "stats": {
        "Posture": 1,
        "Carry Load": 4,
        "Health": 1
      },
      "rarity": "Common",
      "reqs": {
        "Strength": "15"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Last Resort",
      "category": "Duelist",
      "desc": "\nDeal more damage when your health is significantly low. \n",
      "stats": {
        "Health": 3,
        "Sanity": 10
      },
      "rarity": "Common",
      "reqs": {
        "Willpower": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Strong Hold",
      "category": "Duelist",
      "desc": "\nWhen above half health and two-handing, posture damage taken is reduced. \n",
      "stats": {
        "Carry Load": 9,
        "Passive Agility": 1,
        "Health": 1
      },
      "rarity": "Common",
      "reqs": {
        "Strength": "30",
        "Medium Wep.": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Concussive Flash",
      "category": "Duelist Flame",
      "desc": "\nYour blinding light now concusses foes. \n",
      "stats": {
        "Carry Load": 10,
        "Elemental Intensity": 3
      },
      "rarity": "Common",
      "reqs": {
        "Strength": "25",
        "Flamecharm": "40"
      },
      "extraReqs": [
        {
          "type": "Mantra",
          "content": "Flame Blind"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Mantra Req.",
      "new": true
    },
    {
      "name": "Give and Take",
      "category": "Empath",
      "desc": "\nDeal less damage to comrades and receive less damage from comrades.\n",
      "stats": {
        "Ether": 3,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Charisma": "25"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Friends In High Places"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Robber Baron",
      "category": "Escape Artist",
      "desc": "\nYou hold onto more items when defeated.\n",
      "stats": "None",
      "rarity": "Common",
      "reqs": "None",
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Charged Return",
      "category": "Ether Adept",
      "desc": "\nBeing under an elemental status effect causes your physical attacks to do more damage.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Strength": "15",
        "Willpower": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Ether Blade",
      "category": "Ether Adept",
      "desc": "\nDraw your foes ether into your weapon when you parry ether-based attacks. \n",
      "stats": {
        "Ether": 2,
        "Reservoir": 5,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "15",
        "Intelligence": "5"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Magical Resolve",
      "category": "Ether Adept",
      "desc": "\nBeing hit increases ether regen for a short duration.\n",
      "stats": {
        "Health": 3,
        "Sanity": 7
      },
      "rarity": "Common",
      "reqs": {
        "Willpower": "40"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Battle Tendency"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Mantra Permanence",
      "category": "Ether Adept",
      "desc": "\nKnocking an enemy with a mantra refunds the cost of the mantra. \n",
      "stats": {
        "Ether": 5
      },
      "rarity": "Common",
      "reqs": {
        "Intelligence": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Nullifying Clarity",
      "category": "Ether Adept",
      "desc": "\nDeal more damage to enemies with status effects on them with your basic attacks, but the effect is removed upon impact. \n",
      "stats": {
        "Health": 3,
        "Ether": 5
      },
      "rarity": "Common",
      "reqs": {
        "Strength": "15",
        "Intelligence": "5"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Meteor Impact",
      "category": "Falling Star Guard",
      "desc": "\nAerial moves will follow up into a devastating slam.\n",
      "stats": {
        "Elemental Intensity": 4
      },
      "rarity": "Common",
      "reqs": {
        "Flamecharm": "30"
      },
      "extraReqs": [
        {
          "type": "Mantra",
          "content": "Rising Flame"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Mantra Req.",
      "new": true
    },
    {
      "name": "Phoenix Impact",
      "category": "Falling Star Guard",
      "desc": "\nIf you Meteor Slam an opponent whilst on fire, restore some HP and Ether. \n",
      "stats": {
        "Elemental Intensity": 3,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Flamecharm": "35"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Meteor Impact"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Thorns of Fire",
      "category": "Falling Star Guard",
      "desc": "\nTaking damage while using Flame Repulsion reflects the damage back to the attacker. \n",
      "stats": {
        "Elemental Intensity": 2,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Flamecharm": "1"
      },
      "extraReqs": [
        {
          "type": "Mantra",
          "content": "Flame Repulsion"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Mantra Req.",
      "new": true
    },
    {
      "name": "Flamecharmer",
      "category": "Flamecharmer",
      "desc": "\nGrants you the ability to command Fire as a Flamecharmer.\n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Flamecharm": "1"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Adept Flamecharmer",
      "category": "Flamecharmer",
      "desc": "\nYou can now obtain 1-Star Leveled Flamecharmer Mantras. \n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Flamecharm": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Expert Flamecharmer",
      "category": "Flamecharmer",
      "desc": "\nYou can now obtain 2-Star Leveled Flamecharmer Mantras.\n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Flamecharm": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Master Flamecharmer",
      "category": "Flamecharmer",
      "desc": "\nYou can now obtain 3-Star Leveled Flamecharmer Mantras.\n",
      "stats": {
        "Health": 5
      },
      "rarity": "Common",
      "reqs": {
        "Flamecharm": "50"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Azure Flames",
      "category": "Flamecharmer",
      "desc": "\nMany of your flames burn blue, signifying their increased intensity.\n",
      "stats": {
        "Health": 3,
        "Elemental Intensity ": 2
      },
      "rarity": "Common",
      "reqs": {
        "Willpower": "40",
        "Flamecharm": "70"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Produce Spark",
      "category": "Flamecharmer",
      "desc": "\nA simple production of Flame for the use of making Campfires. \n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Flamecharm": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Unyielding Inferno",
      "category": "Flamecharmer",
      "desc": "\nYour flames burn just as strong even in the fiercest of storms. \n",
      "stats": {
        "Elemental Intensity": 4
      },
      "rarity": "Common",
      "reqs": {
        "Flamecharm": "35"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Wildfire",
      "category": "Flamecharmer",
      "desc": "\nPressing [F] before releasing your Flame Impact will release a wider but shorter flame. \n",
      "stats": {
        "Elemental Intensity": 1,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Flamecharm": "20"
      },
      "extraReqs": [
        {
          "type": "Mantra",
          "content": "Flame Palm"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Mantra Req.",
      "new": true
    },
    {
      "name": "Dancing Steps",
      "category": "Flame Dancer",
      "desc": "\nFire mantras now move you in the direction you're facing. \n",
      "stats": {
        "Elemental Intensity": 3
      },
      "rarity": "Common",
      "reqs": {
        "Flamecharm": "35"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Cauterized Wounds",
      "category": "Flame Warden",
      "desc": "\nBlood Loss from all sources are reduced. \n",
      "stats": {
        "Passive Agility": 1,
        "Elemental Intensity": 3,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Fortitude": "5",
        "Flamecharm": "40"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Flamewalker",
      "category": "Flame Warden",
      "desc": "\nWhen Warding Radiance is active you leave trails of flame when you slide.\n",
      "stats": {
        "Passive Agility": 1,
        "Elemental Intensity\n": 3
      },
      "rarity": "Common",
      "reqs": {
        "Flamecharm": "35",
        "Agility": "20"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Warding Radiance"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Hell's Partisan",
      "category": "Flame Warden",
      "desc": "\nAfter landing a flame dagger on an opponent, your next hit against them will impale with a divine spear from above.\n",
      "stats": {
        "Sanity": 4,
        "Elemental Intensity": 1,
        "Health\n": 3
      },
      "rarity": "Common",
      "reqs": {
        "Flamecharm": "35"
      },
      "extraReqs": [
        {
          "type": "Mantra",
          "content": "Fire Forge"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Mantra Req.",
      "new": true
    },
    {
      "name": "Frostdrawer",
      "category": "Frostdrawer",
      "desc": "\nGrants you the ability to command Ice as a Frostdrawer.\n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Frostdraw": "1"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Adept Frostdrawer",
      "category": "Frostdrawer",
      "desc": "\nYou can now obtain 1-Star Leveled Frostdrawer Mantras.\n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Frostdraw": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Expert Frostdrawer",
      "category": "Frostdrawer",
      "desc": "\nYou can now obtain 2-Star Leveled Frostdraw Mantras.\n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Frostdraw": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Master Frostdrawer",
      "category": "Frostdrawer",
      "desc": "\nYou can now obtain 3-Star Leveled Frostdraw Mantras.\n",
      "stats": {
        "Health": 5
      },
      "rarity": "Common",
      "reqs": {
        "Frostdraw": "50"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Glacial Finish",
      "category": "Frost Forger",
      "desc": "\nPress [F] while using your Ice Smash Mantra to follow up with a devastating attack.\n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Frostdraw": "20",
        "Smash": "Ice"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Glacial Mobility",
      "category": "Frost Forger",
      "desc": "\nCast while sliding to perform a running attack with your ice sabers.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Frostdraw": "20",
        "Blade": "Ice"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Glacial Coasting",
      "category": "Frostthorn",
      "desc": "\nSliding while Orbital Ice is active leaves trails of ice.\n",
      "stats": {
        "Passive Agility": 1,
        "Elemental Intensity": 3
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "25",
        "Frostdraw": "50"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Orbital Ice"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Orbital Ice",
      "category": "Frostthorn",
      "desc": "\nWhen landing a parry while standing on ice, automatically forms a ring of gravitational ring of ice that absorbs 25% of the physical damage you take. The ring break after sustaining a certain amount of damage.\n",
      "stats": {
        "Passive Agility": 2,
        "Elemental Intensity": 1,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "20",
        "Frostdraw": "65"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Galebreather",
      "category": "Galebreather",
      "desc": "\nGrants you the ability to command wind as a Galebreather.\n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Galebreath": "1"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Adept Galebreather",
      "category": "Galebreather",
      "desc": "\nYou can now obtain 1-Star Leveled Galebreath Mantras.\n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Galebreath": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Expert Galebreather",
      "category": "Galebreather",
      "desc": "\nYou can now obtain 2-Star Leveled Galebreath Mantras.\n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Galebreath": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Master Galebreather",
      "category": "Galebreather",
      "desc": "\nYou can now obtain 3-Star Leveled Galebreath Mantras.\n",
      "stats": {
        "Health": 5
      },
      "rarity": "Common",
      "reqs": {
        "Galebreath": "50"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Reverse Gale Kick",
      "category": "Galebreather",
      "desc": "\nPressing [F] after hitting an opponent with Wind Rising will cause your follow up kick to impale them to the ground.\n",
      "stats": {
        "Passive Agility": 1
      },
      "rarity": "Common",
      "reqs": {
        "Galebreath": "30",
        "Wind": "Rising"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "The Old Wind",
      "category": "Galebreather",
      "desc": "\nGlide straight with the power of Gales.\n",
      "stats": {
        "Elemental Intensity": 4
      },
      "rarity": "Common",
      "reqs": {
        "Galebreath": "30"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Gale Leap"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Tempest Wind",
      "category": "Gale Duelist",
      "desc": "\nCast Wind Blade while sliding to unleash a quick whirlwind attack.\n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Galebreath": "20"
      },
      "extraReqs": [
        {
          "type": "Mantra",
          "content": "Wind Blade"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Mantra Req.",
      "new": true
    },
    {
      "name": "Aftercut",
      "category": "Galeforce",
      "desc": "\nIf an attack is physical and wind, it will apply an after cut that does 10% of the damage you dealt. \n",
      "stats": {
        "Elemental Intensity": 2,
        "Health ": 3
      },
      "rarity": "Common",
      "reqs": {
        "Galebreath": "40"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Breathing Impact"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Breathing Impact",
      "category": "Galeforce",
      "desc": "\nKnocking enemies into objects with wind spells deals additional blunt damage based on how hard they're hit.\n",
      "stats": {
        "Elemental Intensity": 5
      },
      "rarity": "Common",
      "reqs": {
        "Galebreath": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Inhale",
      "category": "Galeforce",
      "desc": "\nCancelling a wind spell stores its power in your lungs for 5 seconds, empowering the next wind spell cast in that time. \n",
      "stats": {
        "Elemental Intensity": 1,
        "Health ": 3
      },
      "rarity": "Common",
      "reqs": {
        "Galebreath": "50"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Breathing Impact"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Tailwind",
      "category": "Galeforce",
      "desc": "\nGain a speed boost after a successful inhale. \n",
      "stats": {
        "Elemental Intensity": 1,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Galebreath": "50"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Inhale"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "The Thinker",
      "category": "Genius Intellect",
      "desc": "\nStanding still for 15 seconds causes you to rapidly regenerate reservoir and ether. \n",
      "stats": {
        "Ether": 5,
        "Reservoir": 10
      },
      "rarity": "Common",
      "reqs": {
        "Intelligence": "25",
        "Willpower": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Crystal Breaker",
      "category": "Glassdancer",
      "desc": "\nWhen breaking someone's posture detonate any active crystals on their body. \n",
      "stats": {
        "Elemental Intensity": 5,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Frostdraw": "40"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Crystallization"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Glass Path: Crystallization",
      "category": "Glassdancer",
      "desc": "\nYour ice abilities no longer grant a slow effect or the ability to freeze and instead cause ice crystals to grow on your opponent. \n",
      "stats": {
        "Elemental Intensity ": 4
      },
      "rarity": "Common",
      "reqs": {
        "Frostdraw": "40",
        "Out": "Locked"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Aerial Shot",
      "category": "Gunslinger",
      "desc": "\n[Guns] When using a Light Attack while airborne propel yourself forward and fire a shot downwards. \n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Light Wep.": "25"
      },
      "extraReqs": [
        {
          "type": "Equipped",
          "content": "Guns"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Equipped: Guns",
      "new": true
    },
    {
      "name": "Quickdraw",
      "category": "Gunslinger",
      "desc": "\nAllows you to fire your offhand gun right after swinging. [Not necessary on dual guns] \n",
      "stats": {
        "Ether": 4,
        "Reservoir": 8
      },
      "rarity": "Common",
      "reqs": {
        "Light Wep.": "25"
      },
      "extraReqs": [
        {
          "type": "Equipped",
          "content": "Guns"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Equipped: Guns",
      "new": true
    },
    {
      "name": "Bottom Freeze",
      "category": "Ice Age",
      "desc": "\nHitting chilled enemies with shurikens while they are on ice freezes them to the ground. \n",
      "stats": {
        "Elemental Intensity": 5,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Frostdraw": "20",
        "Forge": "Ice"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Cryonis",
      "category": "Ice Age",
      "desc": "\nAll ice spells casted on top of ice cost less Ether. \n",
      "stats": {
        "Elemental Intensity": 5,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Frostdraw": "40"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Frostbite",
      "category": "Ice Age",
      "desc": "\nEnemies can no longer heal when under the effect of your chill. \n",
      "stats": {
        "Elemental Intensity": 5,
        "Health ": 3
      },
      "rarity": "Common",
      "reqs": {
        "Frostdraw": "10"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Frost Buster",
      "category": "Ice Age",
      "desc": "\nGreatsword and Greathammer criticals now place Ice underneath the path they carve.\n",
      "stats": {
        "Elemental Intensity": 5,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Frostdraw": "25",
        "Heavy Wep.": "20"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Cryonis"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Glacial Ice",
      "category": "Ice Age",
      "desc": "\nYour frost is now considerably more intense. \n",
      "stats": {
        "Health": 3,
        "Sanity": 6
      },
      "rarity": "Common",
      "reqs": {
        "Willpower": "20",
        "Frostdraw": "50"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "The Cold Forge",
      "category": "Ice Age",
      "desc": "\nYour forge more shurikens when casting on ice.\n",
      "stats": {
        "Elemental Intensity": 5,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Frostdraw": "30"
      },
      "extraReqs": [
        {
          "type": "Mantra",
          "content": "Ice Forge"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Mantra Req.",
      "new": true
    },
    {
      "name": "Immolation",
      "category": "Immolator",
      "desc": "\nFire spells cost 70% less while on fire. If you hit someone while on fire, apply fire damage.\n",
      "stats": {
        "Sanity": 8
      },
      "rarity": "Common",
      "reqs": {
        "Flamecharm": "40",
        "Willpower": "20"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "https://trello.com/c/i5VkuMXT/393-agitating-spark-inferno"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Agitating Spark",
      "category": "Inferno",
      "desc": "\nIf you hit an opponent that you've lit on fire, it spreads to anyone nearby. Including yourself. \n",
      "stats": {
        "Elemental Intensity": 3
      },
      "rarity": "Common",
      "reqs": {
        "Flamecharm": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "All-Consuming Flame",
      "category": "Inferno",
      "desc": "\nYour flames will incinerate unconscious Targets much faster.\n",
      "stats": {
        "Elemental Intensity": 4
      },
      "rarity": "Common",
      "reqs": {
        "Flamecharm": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Corpse Explosion",
      "category": "Inferno",
      "desc": "\nBodies that you burn to death immediately explode dealing massive damage. \n",
      "stats": {
        "Elemental Intensity": 4,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Flamecharm": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Pleeksty’s Faith",
      "category": "Inferno",
      "desc": "\nWhen on fire, automatically quench flames at the cost of some ether.\n",
      "stats": {
        "Ether": 4
      },
      "rarity": "Common",
      "reqs": {
        "Willpower": "15",
        "Charisma": "15",
        "Flamecharm": "5"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Flying Swiftkick",
      "category": "Justicar",
      "desc": "\nHitting a Jus Karita critical attack while Swiftkick Prodigy is active will greatly slow your enemy and consume your speed boost.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Light Wep.": "20"
      },
      "extraReqs": [
        {
          "type": "Equipped",
          "content": "Jus Karita"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Equipped: Jus Karita",
      "new": true
    },
    {
      "name": "Justicar's Prowess",
      "category": "Justicar",
      "desc": "\nJus Karita does bonus posture damage against other Fist styles.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Light Wep.": "20"
      },
      "extraReqs": [
        {
          "type": "Equipped",
          "content": "Jus Karita"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Equipped: Jus Karita",
      "new": true
    },
    {
      "name": "Justicar's Renewal",
      "category": "Justicar",
      "desc": "\nHitting an opponent with your Jus Karita critical resets the cooldown. (Cooldown of 10 seconds)\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Light Wep.": "20"
      },
      "extraReqs": [
        {
          "type": "Equipped",
          "content": "Jus Karita"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Equipped: Jus Karita",
      "new": true
    },
    {
      "name": "Jus Karita",
      "category": "Justicar",
      "desc": "\nThe fighting style of the Justicars.\n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Light Wep.": "40"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": "30",
      "note": " P30",
      "new": true
    },
    {
      "name": "Swiftkick Prodigy",
      "category": "Justicar",
      "desc": "\nHitting successive basic attacks with Jus Karita will give you a temporary speed buff.\n",
      "stats": {
        "Health": 2,
        "Posture": 1
      },
      "rarity": "Common",
      "reqs": {
        "Light Wep.": "20"
      },
      "extraReqs": [
        {
          "type": "Equipped",
          "content": "Jus Karita"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Equipped: Jus Karita",
      "new": true
    },
    {
      "name": "Blade's Edge",
      "category": "Lancer",
      "desc": "\n[Spears] Damage dealt with the tip of the spear is increased by 10%.\n",
      "stats": {
        "Passive Agility": 2,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Medium Wep.": "30"
      },
      "extraReqs": [
        {
          "type": "Equipped",
          "content": "Spear"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Equipped: Spear",
      "new": true
    },
    {
      "name": "Defensive Sweep",
      "category": "Lancer",
      "desc": "\n[Spears] Posture breaking an opponent grants you +50% Penetration for 3 seconds.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Medium Wep.": "35"
      },
      "extraReqs": [
        {
          "type": "Equipped",
          "content": "Spear"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Equipped: Spear",
      "new": true
    },
    {
      "name": "Driving Impact",
      "category": "Lancer",
      "desc": "\n[Spears] The first hit of your Spear's Critical Attack will deal the posture damage of the second hit as well. The second hit no longer deals posture damage.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Medium Wep.": "30",
        "undefined": "Spear"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Lancer's Impale",
      "category": "Lancer",
      "desc": "\n[Spears] Hitting an enemy after a perfect dodge makes your next attack deal bleed damage.\n",
      "stats": {
        "Agility": 4
      },
      "rarity": "Common",
      "reqs": {
        "Medium Wep.": "30"
      },
      "extraReqs": [
        {
          "type": "Equipped",
          "content": "Spear"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Equipped: Spear",
      "new": true
    },
    {
      "name": "Eruption Path: Lava Serpent",
      "category": "Lava Serpent",
      "desc": "\nYour fire abilities no longer proc burn and instead proc on eruption under the enemies feet.\n",
      "stats": {
        "Elemental Intensity": 4
      },
      "rarity": "Common",
      "reqs": {
        "Flamecharm": "40"
      },
      "extraReqs": [
        {
          "type": "Locks Out",
          "content": "The Final Act"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Locks",
      "new": true
    },
    {
      "name": "Callout",
      "category": "Leader",
      "desc": "\nYou can mark objects or enemies by pressing Z, which will mark them for all nearby allies.\n",
      "stats": {
        "Ether": 1,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Charisma": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Air Pressure",
      "category": "Legion Shock Trooper",
      "desc": "\nIf you hit their block, immediately follow them up with a wind dash.\n",
      "stats": {
        "Passive Agility": 1,
        "Elemental Intensity": 2
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "20",
        "Galebreath": "40"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Cyclone Blade",
      "category": "Legion Shock Trooper",
      "desc": "\nAfter a successful Gale Dash you wrap your weapon in wind essence causing your next Light attack to do bleed damage and chip through your opponents block.\n",
      "stats": {
        "Passive Agility": 2,
        "Elemental Intensity": 2,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "20",
        "Galebreath": "30"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Gale Dash"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Hoplite",
      "category": "Legion Shock Trooper",
      "desc": "\nPosture damage is reduced when wielding a spear and holding still. \n",
      "stats": {
        "Passive Agility": 2,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Fortitude": "15",
        "equiped": "spear"
      },
      "extraReqs": [
        {
          "type": "Equipped",
          "content": "Spear"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Equipped: Spear",
      "new": true
    },
    {
      "name": "Pressure Break",
      "category": "Legion Shock Trooper",
      "desc": "\nBreaking an enemy's posture will cause them take intense wind pressure damage and be flung backwards. \n",
      "stats": {
        "Carry Load": 8,
        "Passive Agility": 2,
        "Health": 2
      },
      "rarity": "Common",
      "reqs": {
        "Strength": "5",
        "Agility": "20",
        "Galebreath": "40"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Air Pressure"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Wind Step",
      "category": "Legion Shock Trooper",
      "desc": "\nCreate a step of wind below you when jumping in the air.\n",
      "stats": {
        "Elemental Intensity": 4
      },
      "rarity": "Common",
      "reqs": {
        "Galebreath": "50"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Gale Leap"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Savior",
      "category": "Liberator",
      "desc": "\nAfter saving a player from being gripped gain a short speed boost for a short duration.\n",
      "stats": {
        "Health": 3,
        "Sanity": 1
      },
      "rarity": "Common",
      "reqs": {
        "Willpower": "5"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Uproar",
      "category": "Limitbreaker",
      "desc": "\nWhen struck 3 or more times within 3 seconds, go into a state of uproar where you cannot be stunned for a short duration. \n",
      "stats": {
        "Ether": 4
      },
      "rarity": "Common",
      "reqs": {
        "Fortitude": "35"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Comeback Kid",
      "category": "Limitbreaker",
      "desc": "\nWhen waking up from being knocked you are unable to be knocked down for 5 seconds. (120 second cooldown)\n",
      "stats": {
        "Health": 3,
        "Ether": 5
      },
      "rarity": "Common",
      "reqs": {
        "undefined": ""
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Defiant Until The End",
      "category": "Limitbreaker",
      "desc": "\nSlow the enemy trying to execute you down with one last shout of your determination.\n",
      "stats": {
        "Health": 3,
        "Sanity": 6
      },
      "rarity": "Common",
      "reqs": {
        "Willpower": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "The Eleventh Hour",
      "category": "Limitbreaker",
      "desc": "\nWhen below 15% health your mantras require no ether to cast for 3 seconds. (30 Second Cooldown)\n",
      "stats": {
        "Health": 3,
        "Sanity": 10
      },
      "rarity": "Common",
      "reqs": {
        "Willpower": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Eureka",
      "category": "Adept Caster",
      "desc": "\nReceive ether back on every successful perfect cast.\n",
      "stats": {
        "Carry Load": 7,
        "Elemental Intensity": 2
      },
      "rarity": "Rare",
      "reqs": {
        "Intelligence": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Everchanging Aegis",
      "category": "Adept Caster",
      "desc": "\nWhen hit with an element, take reduced damage from said element, but take more damage from any other element.\n",
      "stats": {
        "Carry Load": 7,
        "Elemental Intensity": 2
      },
      "rarity": "Rare",
      "reqs": {
        "Intelligence": "25"
      },
      "extraReqs": [
        {
          "type": "Locks Out",
          "content": "Return To The Dark Ages"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Locks",
      "new": true
    },
    {
      "name": "Overflowing Dam",
      "category": "Adept Caster",
      "desc": "\nHaving full Ether for 1.5 seconds or more grants an aura to your attacks that grants them 15% more damage.\n",
      "stats": "None",
      "rarity": "Rare",
      "reqs": {
        "Intelligence": "40"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Perfect Flash",
      "category": "Adept Caster",
      "desc": "\nHaving full health causes your mantras do 1.25x damage.\n",
      "stats": "None",
      "rarity": "Rare",
      "reqs": {
        "Intelligence": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Wyvern's Claw",
      "category": "Aerial Dancer",
      "desc": "\nAttacks hit when not touching the ground deals slightly more damage.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Strength": "20",
        "Medium Wep.": "25"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Aerogliding",
      "category": "Aeromancy",
      "desc": "\nWhen falling from a high place, hold spacebar to generate wind currents until you hit the floor.\n",
      "stats": {
        "Passive Agility": 2,
        "Elemental Intensity": 5,
        "Health": 2
      },
      "rarity": "Rare",
      "reqs": {
        "Agility": "30",
        "Galebreath": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Stifled Jump",
      "category": "Aeromancy",
      "desc": "\nEnemies who jump while suffocated by you are dazed.\n",
      "stats": {
        "Passive Agility": 2,
        "Elemental Intensity": 5
      },
      "rarity": "Rare",
      "reqs": {
        "Strength": "30",
        "Galebreath": "50"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Placebo Effect",
      "category": "Alchemist",
      "desc": "\nDrinking potions near allies has a chance to inflict the potion’s effect upon them.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Intelligence": "55"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Subsistence",
      "category": "Alchemist",
      "desc": "\nAs a skilled apothecarian, you are more accustomed to potions and gain greater benefits from ingesting potions that affect your regeneration.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Intelligence": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Carnivore",
      "category": "Apex Predator",
      "desc": "\nIn return for losing the ability to eat vegetation, sate your hunger by gripping monsters and people alike.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Strength": "5",
        "Willpower": "5"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Lightspeed Reflexes",
      "category": "Assassin",
      "desc": "\nFeinting gives a brief auto-parry window. \n",
      "stats": {
        "Passive Agility": 1
      },
      "rarity": "Rare",
      "reqs": {
        "Agility": "20",
        "Intelligence": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Heavy Fatigue",
      "category": "Bruiser",
      "desc": "\n[Greataxes] Hitting an enemy slowed by your Greataxe temporarily reduces how far they can roll.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Heavy Wep.": "30"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Impairing Blow"
        },
        {
          "type": "Equipped",
          "content": "Greataxe"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req. Equipped: Greataxe",
      "new": true
    },
    {
      "name": "Rending Impact",
      "category": "Bruiser",
      "desc": "\n[Greataxes] Block breaking an enemy applies knockdown.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Heavy Wep.": "40"
      },
      "extraReqs": [
        {
          "type": "Equipped",
          "content": "Greataxe"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Equipped: Greataxe",
      "new": true
    },
    {
      "name": "Risky Moves",
      "category": "Butterfly",
      "desc": "\nWhen you successfully dodge, you'll automatically dodge the next attack.\n",
      "stats": {
        "Passive Agility": 1
      },
      "rarity": "Rare",
      "reqs": {
        "Agility": "25"
      },
      "extraReqs": [
        {
          "type": "Locked by",
          "content": "Observation, Safety Dance"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Locks",
      "new": true
    },
    {
      "name": "Defiance",
      "category": "Champion",
      "desc": "\nStatus effects are half as effective when you are below 35% HP. \n",
      "stats": {
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Willpower": "50"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Destructive Recovery",
      "category": "Colossus",
      "desc": "\n[Greatsword] You deal additional posture damage when you parry enemies.\n",
      "stats": {
        "Posture": 1,
        "Carry Load": 2
      },
      "rarity": "Rare",
      "reqs": {
        "Strength": "25",
        "Heavy Wep.": "40"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Harsh Response"
        },
        {
          "type": "Equipped",
          "content": "Greatsword"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req. Equipped: Greatsword",
      "new": true
    },
    {
      "name": "Blood Shadow",
      "category": "Comrade",
      "desc": "\nAllies you Reinforce is drained of their HP until you are full.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Shadowcast": "50",
        "Mantra": "Reinforce"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Grand Support",
      "category": "Comrade",
      "desc": "\nEveryone you buff heals them slightly.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Fortitude": "50"
      },
      "extraReqs": [
        {
          "type": "Mantra",
          "content": "Reinforce"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Mantra Req.",
      "new": true
    },
    {
      "name": "Lord Commander",
      "category": "Comrade",
      "desc": "\nEveryone you buff with reinforce heals you by 1%.\n",
      "stats": {
        "Health": 5
      },
      "rarity": "Rare",
      "reqs": {
        "Fortitude": "50"
      },
      "extraReqs": [
        {
          "type": "Mantra",
          "content": "Reinforce"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Mantra Req.",
      "new": true
    },
    {
      "name": "Knife's Journey",
      "category": "Critical Specialist",
      "desc": "\nYou now have 10% chance to do 1.2x damage with daggers.\n",
      "stats": {
        "Health": 2
      },
      "rarity": "Rare",
      "reqs": {
        "Light Wep.": "30"
      },
      "extraReqs": [
        {
          "type": "Equipped",
          "content": "Dagger"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Equipped: Dagger",
      "new": true
    },
    {
      "name": "Thresher Fangs",
      "category": "Critical Specialist",
      "desc": "\nYour crits now deal 2x damage to armor.\n",
      "stats": {
        "Health": 2
      },
      "rarity": "Rare",
      "reqs": {
        "Light Wep.": "30"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Knife's Journey"
        },
        {
          "type": "Equipped",
          "content": "Dagger"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req. Equipped: Dagger",
      "new": true
    },
    {
      "name": "Preceding Chill",
      "category": "Cryoni",
      "desc": "\nEnemies hit during the last moments of your ice beam are frozen.\n",
      "stats": {
        "Elemental Intensity": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Frostdraw": "10"
      },
      "extraReqs": [
        {
          "type": "Mantra",
          "content": "Ice Beam"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Mantra Req.",
      "new": true
    },
    {
      "name": "Dark Rift",
      "category": "Darksiphon",
      "desc": "\nEnter a rifted state when you sucessfully dodge, where you can't be damaged until its duration ends. Can be cancelled with feinting or attacking.\n",
      "stats": {
        "Elemental Intensity": 4,
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Shadowcast": "50"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Dark Hours"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Blackhole",
      "category": "Death Speaker",
      "desc": "\nYour singularity pulls everyone nearby in.\n",
      "stats": {
        "Elemental Intensity": 1,
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Shadowcast": "60"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Singularity"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Concussion",
      "category": "Duelist",
      "desc": "\nEnemies you flourish into walls have their vision altered for a short duration and are dazed longer than usual.\n",
      "stats": {
        "Health": 3,
        "Carry Load": 8
      },
      "rarity": "Rare",
      "reqs": {
        "Strength": "20",
        "Fortitude": "15"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Spine Cutter",
      "category": "Duelist",
      "desc": "\nHitting an enemy in the back after a roll cancel will initiate a second slash.\n",
      "stats": {
        "Carry Load": 6,
        "Passive Agility": 2
      },
      "rarity": "Rare",
      "reqs": {
        "Strength": "20",
        "Agility": "25"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Strong Stern",
      "category": "Duelist",
      "desc": "\nThe duration you are dazed from wall bangs is cut in half.\n",
      "stats": {
        "Health": 3,
        "Carry Load": 9
      },
      "rarity": "Rare",
      "reqs": {
        "Strength": "15",
        "Fortitude": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Tap Dancer",
      "category": "Duelist",
      "desc": "\nRoll again immediately after a roll cancel.\n",
      "stats": {
        "Passive Agility": 1,
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Agility": "60"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Fishman",
      "category": "Fish",
      "desc": "\nHeal while swimming. Just remember that there's always a bigger fish. \n",
      "stats": {
        "Health": 5
      },
      "rarity": "Rare",
      "reqs": "None",
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Graceful Steps",
      "category": "Flame Dancer",
      "desc": "\nYour fire mantras now grant you a speed boost.\n",
      "stats": {
        "Elemental Intensity": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Flamecharm": "75"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Dancing Steps"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Flaming Rebound",
      "category": "Flame Dancer",
      "desc": "\nLanding fire mantras will restore your Reservoir.\n",
      "stats": {
        "Elemental Intensity": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Flamecharm": "50"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "The Final Act",
      "category": "Flame Dancer",
      "desc": "\nLanding a fire mantra immediately after flourishing an opponent will cause them to explode.\n\n",
      "stats": {
        "Elemental Intensity\n": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Flamecharm": "50"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": "40",
      "note": " P40",
      "new": true
    },
    {
      "name": "Warding Radiance",
      "category": "Flame Warden",
      "desc": "\nEvery fire mantra builds up one halo stack. At 3 stacks a halo appears that allows you to slide further. Hell's Partisan is also triggered passively while this is active.\n\n",
      "stats": {
        "Passive Agility": 1,
        "Elemental Intensity": 3,
        "Health\nMantra: Fire Forge": 2
      },
      "rarity": "Rare",
      "reqs": {
        "Agility": "20",
        "Flamecharm": "35",
        "Hell's": "Talent:"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Exoskeleton",
      "category": "Freak of Nature",
      "desc": "\nYou have a layer of fortified Natural Armor that replenishes when you rest. Your Natural Armor will resist 10% of Physical Damage while active. \n",
      "stats": {
        "Health": 10
      },
      "rarity": "Rare",
      "reqs": {
        "Fortitude": "40"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Potion Quaffer",
      "category": "Freak of Nature",
      "desc": "\nYou're accustomed to drinking toxic fluids quickly. You'll get along famously with the other patrons at the tavern. \n",
      "stats": {
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Fortitude": "15",
        "Willpower": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "To The Finish",
      "category": "Freak of Nature",
      "desc": "\nYou take 10% less damage when below 30% health.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Fortitude": "50"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Frozen Legs",
      "category": "Frozen Warrior",
      "desc": "\nYour slow effect prevents opponents from rolling.\n",
      "stats": {
        "Elemental Intensity": 5,
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Frostdraw": "50"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Neuroplasticity",
      "category": "Genius Intellect",
      "desc": "\nYour mind is a pliable, flexible substance. The Ether cost of additional modifications on your Mantra is now reduced by 20%.\n",
      "stats": {
        "Wildcard Mantra Slot": 1,
        "Reservoir": 20
      },
      "rarity": "Rare",
      "reqs": {
        "Intelligence": "35",
        "Willpower": "35",
        "Charisma": "35"
      },
      "extraReqs": [],
      "multipleReqs": true,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "True Pain",
      "category": "Critical Specialist",
      "desc": "\nYour critical strikes can now crit.\n",
      "stats": {
        "Health": 2
      },
      "rarity": "Rare",
      "reqs": {
        "Light Wep.": "30"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Knife's Journey"
        },
        {
          "type": "Equipped",
          "content": "Dagger"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req. Equipped: Dagger",
      "new": true
    },
    {
      "name": "Armor Piercing",
      "category": "Gunslinger",
      "desc": "\nYour bullets now ignore 25% of an opponent's blunt armor.\n",
      "stats": {
        "Ether": 2,
        "Reservoir": 8,
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Light Wep.": "1"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "True Ether Bullets",
      "category": "Gunslinger",
      "desc": "\nUsing Ether Bullets applies elemental damage of your highest investment.\n",
      "stats": {
        "Ether": 4,
        "Reservoir": 7
      },
      "rarity": "Rare",
      "reqs": {
        "Intelligence": "30",
        "Light Wep.": "20"
      },
      "extraReqs": [
        {
          "type": "Equipped",
          "content": "Guns"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Equipped: Guns",
      "new": true
    },
    {
      "name": "All The Dead Gods",
      "category": "Heretic",
      "desc": "\nYour M1s now apply anti-heal.\n",
      "stats": {
        "Health": 3,
        "Sanity": 7
      },
      "rarity": "Rare",
      "reqs": {
        "Intelligence": "40",
        "WIllpower": "65"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Peripheral Vision",
      "category": "Hunter",
      "desc": "\nYour glare now ignores if your opponent is facing you.\n",
      "stats": "None",
      "rarity": "Rare",
      "reqs": {
        "Willpower": "40"
      },
      "extraReqs": [
        {
          "type": "Mantra",
          "content": "Glare"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Mantra Req.",
      "new": true
    },
    {
      "name": "Frozen Pin-Cushion",
      "category": "Ice Age",
      "desc": "\nHitting an opponent with your Ice Daggers causes them to freeze.\n",
      "stats": {
        "Elemental Intensity": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Frostdraw": "20"
      },
      "extraReqs": [
        {
          "type": "Mantra",
          "content": "Ice Daggers"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Mantra Req.",
      "new": true
    },
    {
      "name": "Frozone",
      "category": "Ice Age",
      "desc": "\nYou are no longer required to be over water to use Ice Skate.\n",
      "stats": {
        "Elemental Intensity": 5,
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Frostdraw": "75"
      },
      "extraReqs": [
        {
          "type": "Mantra",
          "content": "Ice Skate"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Mantra Req.",
      "new": true
    },
    {
      "name": "Skull Crusher",
      "category": "Galeforce",
      "desc": "\nPressing F during Champion's Whirlthrow will toss your opponent straight down.\n",
      "stats": {
        "carryload": 6
      },
      "rarity": "Rare",
      "reqs": {
        "Strength": "30",
        "Galebreath": "50"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Saint Jay",
      "category": "Ice Age",
      "desc": "\nWhen a chilled enemy receives a heal it's then redirected to you instead. While this is active and they are on ice your rate of healing is doubled.\n",
      "stats": {
        "Elemental Intensity": 5,
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Frostdraw": "25"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Frostbite"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Shatter Spear",
      "category": "Ice Age",
      "desc": "\nYour ice spear now lodges into human opponents and explodes.\n",
      "stats": {
        "Elemental Intensity": 5,
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Frostdraw": "30"
      },
      "extraReqs": [
        {
          "type": "Mantra",
          "content": "Ice Lance"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Mantra Req.",
      "new": true
    },
    {
      "name": "Grand Skewer",
      "category": "Javelin Lord",
      "desc": "\nYour Grand Javelin now carries opponents through the air. \n",
      "stats": {
        "Elemental Intensity": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Thundercall": "60"
      },
      "extraReqs": [
        {
          "type": "Mantra",
          "content": "Grand Javelin"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Mantra Req.",
      "new": true
    },
    {
      "name": "Evasive Expert",
      "category": "Leaf in the Wind",
      "desc": "\nYour speed boost granted from dodging is increased.\n",
      "stats": {
        "Passive Agility": 1
      },
      "rarity": "Rare",
      "reqs": {
        "Agility": "15"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Swift Rebound"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Observation",
      "category": "Leaf in the Wind",
      "desc": "\nDodge frames are larger if you cancel your roll immediately.\n",
      "stats": {
        "Passive Agility": 1
      },
      "rarity": "Rare",
      "reqs": {
        "Agility": "20"
      },
      "extraReqs": [
        {
          "type": "Locked by",
          "content": "Risky Moves"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Locks",
      "new": true
    },
    {
      "name": "Safety Dance",
      "category": "Leaf in the Wind",
      "desc": "\nYour dodge frames are doubled.\n",
      "stats": {
        "Passive Agility": 1
      },
      "rarity": "Rare",
      "reqs": {
        "Agility": "15"
      },
      "extraReqs": [
        {
          "type": "Locks",
          "content": "Risky Moves"
        }
      ],
      "multipleReqs": false,
      "power": "40",
      "note": " P40 Locks",
      "new": true
    },
    {
      "name": "Gale Dash",
      "category": "Legion Shock Trooper",
      "desc": "\nAfter dodging an attack successfully, your next dash will be a Gale Dash.\n",
      "stats": {
        "Passive Agility": 2,
        "Elemental Intensity": 4,
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Agility": "25",
        "Galebreath": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Dirty Boxing",
      "category": "Limitbreaker",
      "desc": "\nEnemies hit after you feint them with your fist suffer slight bleed and have their vision obscured slightly.\n",
      "stats": {
        "Passive Agility": 1,
        "Health": 2
      },
      "rarity": "Rare",
      "reqs": {
        "Agility": "25",
        "Light Wep.": "1"
      },
      "extraReqs": [
        {
          "type": "Equipped",
          "content": "Fists"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Equipped: Fists",
      "new": true
    },
    {
      "name": "Lose Your Mind",
      "category": "Limitbreaker",
      "desc": "\nDeal more damage the more insane you are, but go insane twice as quickly. \n",
      "stats": {
        "Health": 3,
        "Sanity": 5
      },
      "rarity": "Rare",
      "reqs": {
        "Strength": "30",
        "Fortitude": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Piercing Will",
      "category": "Limitbreaker",
      "desc": "\nWhen your sanity is at stake gain +20% PEN on your attacks. \n",
      "stats": {
        "Ether": 4
      },
      "rarity": "Rare",
      "reqs": {
        "Willpower": "80"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Aggressive Posture",
      "category": "Marauder",
      "desc": "\nHitting your opponent causes them to slow down while holding S.\n",
      "stats": {
        "Passive Agility": 1
      },
      "rarity": "Rare",
      "reqs": {},
      "extraReqs": [],
      "multipleReqs": false,
      "power": "40",
      "note": " P40",
      "new": true
    },
    {
      "name": "Thresher Claws",
      "category": "Marauder",
      "desc": "\nAll of your attacks have 10% more PEN\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {},
      "extraReqs": [],
      "multipleReqs": false,
      "power": "40",
      "note": " P40",
      "new": true
    },
    {
      "name": "Warrior's Respite",
      "category": "Meditative Trance",
      "desc": "\nStop moving for 15 seconds in order to initiate healing.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Fortitude": "15"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Lootskipper",
      "category": "Metamancer",
      "desc": "\nMobs have a much higher chance to drop their rarest loot when slain\n",
      "stats": {
        "Health": 3,
        "Carry Load": 4
      },
      "rarity": "Rare",
      "reqs": "None",
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Champion's Regalia",
      "category": "Navaen Nomad",
      "desc": "\nFlourishing an opponent grants you 1.5x posture damage for 10 seconds.\n",
      "stats": {
        "Health": 4,
        "Carry Load": 1
      },
      "rarity": "Rare",
      "reqs": {
        "Strength": "25"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Fists of Fortitude",
      "category": "Navaen Nomad",
      "desc": "\nEvery 6 Light Hits builds of a Shield of Endurance reducing incoming damage by 15%.\n",
      "stats": {
        "Health": 3,
        "Carry Load": 1
      },
      "rarity": "Rare",
      "reqs": {
        "Fortitude": "20"
      },
      "extraReqs": [
        {
          "type": "Equipped",
          "content": "Fists"
        },
        {
          "type": "Locked by",
          "content": "Orbital Ice"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Equipped: Fists Locks",
      "new": true
    },
    {
      "name": "Under The Radar",
      "category": "Public Figure",
      "desc": "\nthe negative reputation threshold for a faction to put up on bounty posters is now higher.\n",
      "stats": {
        "Ether": 4,
        "Health": 4
      },
      "rarity": "Rare",
      "reqs": {
        "Charisma": "50"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Bulldozer",
      "category": "Raging Bull",
      "desc": "\n\nEnemies you flourish into a wall has a chance of breaking the wall and are guard broken on impact.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Strength": "25"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Shadow Travel",
      "category": "Shadowcaster",
      "desc": "\nTeleport to a location in exchange for Ether cost. Certain ranges will require a health sacrifice. Be careful as this technique can prove lethal to the user. \n",
      "stats": "None",
      "rarity": "Rare",
      "reqs": {
        "Shadowcast": "75"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Dark God"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Encore",
      "category": "Singer",
      "desc": "\nYour Sing now stun opponents who are already charmed.\n",
      "stats": {
        "Health": 4
      },
      "rarity": "Rare",
      "reqs": {
        "Charisma": "15"
      },
      "extraReqs": [
        {
          "type": "Mantra",
          "content": "Sing"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Mantra Req.",
      "new": true
    },
    {
      "name": "Silencer's Blade",
      "category": "Silencer",
      "desc": "\nMeleeing a 'Suffocated' opponent will extend the duration of the Suffocation.\n",
      "stats": {
        "Elemental Intensity": 1,
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Galebreath": "50"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Silencer's Edge"
        }
      ],
      "multipleReqs": false,
      "power": "30",
      "note": " P30 Talent Req.",
      "new": true
    },
    {
      "name": "Golden Tongue",
      "category": "Silvertongue",
      "desc": "\nTyping gives a random buff to you and those around you.\n",
      "stats": {
        "Ether": 4,
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Charisma": "40"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Bloodiron Spirit",
      "category": "Soul Converter",
      "desc": "\nYou regain some Armor upon killing enemies.\n",
      "stats": {
        "Health": 5
      },
      "rarity": "Rare",
      "reqs": "None",
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Punishing Blow",
      "category": "Tactician",
      "desc": "\nDaze swinging opponents when hitting them with an M1 with a heavy weapon.\n",
      "stats": {
        "Ether": 4
      },
      "rarity": "Rare",
      "reqs": {
        "Heavy Wep.": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Exploding Mirage Clone",
      "category": "The Emperor's Blade",
      "desc": "\nYour mirage clones now explode.\n",
      "stats": {
        "Elemental Intensity": 4,
        "Health": 2
      },
      "rarity": "Rare",
      "reqs": {
        "Flamecharm": "70"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Mirage Clone"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Mirage Clone",
      "category": "The Emperor's Blade",
      "desc": "\nSuccessfully dodging leaves a heat mirage clone that sets enemies that swung at you on fire.\n",
      "stats": {
        "Elemental Intensity": 4,
        "Health": 2
      },
      "rarity": "Rare",
      "reqs": {
        "Flamecharm": "65"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Static Fakeout",
      "category": "Thundercaller",
      "desc": "\nRoll cancelling immediately after a parry will cause you to teleport behind your opponent.\n",
      "stats": {
        "Elemental Intensity": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Agility": "30",
        "Thundercall": "35"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "All Knowing",
      "category": "Omniscient",
      "desc": "\nYour prediction now ignores the range requirement to reflect attacks.\n",
      "stats": {
        "Elemental Intensity": 3,
        "Ether": 10
      },
      "rarity": "Rare",
      "reqs": {
        "Intelligence": "60",
        "Mantra": "Prediction"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Cheap Shot",
      "category": "Trickster",
      "desc": "\nYour attacks gain 10% PEN when you have an active speedboost.\n",
      "stats": {
        "Passive Agility": 6
      },
      "rarity": "Rare",
      "reqs": {
        "Agility": "65"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Denial Repulse",
      "category": "Undying Ember",
      "desc": "\nYou now emit a delayed burst of flames after coming close to death. \n",
      "stats": {
        "Elemental Intensity": 1,
        "Health": 1
      },
      "rarity": "Rare",
      "reqs": {
        "Willpower": "40"
      },
      "extraReqs": [
        {
          "type": "Mantra",
          "content": "Flame of Denial"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Mantra Req.",
      "new": true
    },
    {
      "name": "Undying Flame",
      "category": "Undying Ember",
      "desc": "\nYour flame can be casted in the depths.\n",
      "stats": {
        "Elemental Intensity": 1,
        "Health": 2
      },
      "rarity": "Rare",
      "reqs": {
        "Willpower": "40",
        "Flamecharm": "40"
      },
      "extraReqs": [
        {
          "type": "Mantra",
          "content": "Graceful Flame"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Mantra Req.",
      "new": true
    },
    {
      "name": "Speed Demon",
      "category": "Vigil Swordsman",
      "desc": "\nYour attacks now inflict bleed while you have a speed boost. \n",
      "stats": {
        "Passive Agility": 1
      },
      "rarity": "Rare",
      "reqs": {
        "Agility": "25"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Command: Return",
      "category": "Vow of Mastery",
      "desc": "\nCommand your servant to obey your vow and return to your side. \n",
      "stats": {
        "Ether": 4,
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Charisma": "60"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Vow of Mastery"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Command: Sacrifice",
      "category": "Vow of Mastery",
      "desc": "\nSacrifice the health of a servant in order to restore your own.\n",
      "stats": {
        "Ether": 4,
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Charisma": "50"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Vow of Mastery"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Chronostasis",
      "category": "Warrior",
      "desc": "\nLanding an M1 puts target resonance on cooldown for a short duration.\n",
      "stats": {
        "Ether": 5,
        "Posture": 1
      },
      "rarity": "Rare",
      "reqs": {},
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Engage"
        }
      ],
      "multipleReqs": false,
      "power": "40",
      "note": " P40 Talent Req.",
      "new": true
    },
    {
      "name": "Scuba Drowner",
      "category": "Waterborne",
      "desc": "\nYou won't always drown to death when downed in water.\n",
      "stats": {
        "Passive Agility": 3,
        "Health": 5
      },
      "rarity": "Rare",
      "reqs": "None",
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Showstopper",
      "category": "Weapon Master",
      "desc": "\nWhen an enemy would roll through one of your physical attacks, stomp the ground, dazing anyone nearby.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Rare",
      "reqs": {
        "Strength": "40"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Impervious Slumber",
      "category": "Miscellaneous",
      "desc": "\nGetting hit while knocked no longer resets your time knocked.\n",
      "stats": {
        "Health": 3,
        "Ether": 5
      },
      "rarity": "Rare",
      "reqs": {
        "Fortitude": "35"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Return to the Dark Ages",
      "category": "Miscellaneous",
      "desc": "\nYour mantra damage is cut by 35%, but your incoming mantra damage is cut by 35% too.\n",
      "stats": {
        "Health": 5
      },
      "rarity": "Rare",
      "reqs": {},
      "extraReqs": [],
      "multipleReqs": false,
      "power": "30",
      "note": " P30",
      "new": true
    },
    {
      "name": "Conditioned Runner",
      "category": "Alley Cat",
      "desc": "\nYou regenerate health faster than normal when running.\n",
      "stats": {
        "Agility": 1
      },
      "rarity": "Advanced",
      "reqs": {
        "Fortitude": "25",
        "Agility": "25"
      },
      "extraReqs": [
        {
          "type": "Locked by",
          "content": "Fishman"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Locks",
      "new": true
    },
    {
      "name": "Reinforced Armor",
      "category": "Bastion",
      "desc": "\nIncoming PEN is reduced by 25%.\n",
      "stats": {
        "Ether": 10,
        "Health": 3
      },
      "rarity": "Advanced",
      "reqs": {
        "Fortitude": "90",
        "Willpower": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Ghost",
      "category": "Butterfly",
      "desc": "\nDodging a move will briefly make you invisible or until you attack.\n",
      "stats": {
        "Passive Agility": 5
      },
      "rarity": "Advanced",
      "reqs": {
        "Agility": "40"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Butterfly"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Dazing Finisher",
      "category": "Charm Caster",
      "desc": "\nFlourishing enemies that are charmed by you cause them not to be knocked back and dazed instead.\n",
      "stats": {
        "Ether": 4
      },
      "rarity": "Advanced",
      "reqs": {
        "Charisma": "40"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Charismatic Cast"
        },
        {
          "type": "Locks Out",
          "content": "Vanishing Follow-Up"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req. Locks",
      "new": true
    },
    {
      "name": "Brick Wall",
      "category": "Human Architecture",
      "desc": "\nYou refuse. You cannot be knocked off your feet until you are knocked completely unconscious.\n",
      "stats": {
        "Posture": 2
      },
      "rarity": "Advanced",
      "reqs": {
        "Fortitude": "100",
        "Willpower": "100"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Perseverance"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Phoenix Flames",
      "category": "Immolator",
      "desc": "\nAny time you would burn to death, you instead rise again with 50% of your health restored.\n",
      "stats": {
        "Health": 3,
        "Elemental Intensity": 2
      },
      "rarity": "Advanced",
      "reqs": {
        "Willpower": "20",
        "Flamecharm": "40"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Immolation"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Million Ton Piercer",
      "category": "Raging Bull",
      "desc": "\nYour PEN is uncapped, go beyond your limits.\n",
      "stats": {
        "Ether": 10,
        "Health": 3
      },
      "rarity": "Advanced",
      "reqs": {
        "Strength": "90"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "A World Without Song",
      "category": "Silencer",
      "desc": "\nAll of your wind attacks apply 'Suffocate'.\n",
      "stats": {
        "Elemental Intensity": 1,
        "Health": 3
      },
      "rarity": "Advanced",
      "reqs": {
        "Galebreath": "75"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Silencer's Edge"
        }
      ],
      "multipleReqs": false,
      "power": "25",
      "note": " P25 Talent Req.",
      "new": true
    },
    {
      "name": "Another Man's Trash",
      "category": "Thief",
      "desc": "\nTake unequipped equipment when mugging a player.\n",
      "stats": {
        "Ether": 3,
        "Passive Agility": 2,
        "Health": 3
      },
      "rarity": "Advanced",
      "reqs": {
        "Agility": "15",
        "Charisma": "35"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Thief"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Command: Live",
      "category": "Vow of Mastery",
      "desc": "\nOnce per hour, command a servant to defy all odds and obey your command - live.\n",
      "stats": {
        "Ether": 4,
        "Health": 3
      },
      "rarity": "Advanced",
      "reqs": {
        "Charisma": "75"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Vow of Mastery"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Bloodletter",
      "category": "Marauder",
      "desc": "\nHitting opponents on the ground lowers their blood.\n",
      "stats": {
        "Passive Agility": 1
      },
      "rarity": "Common",
      "reqs": {},
      "extraReqs": [],
      "multipleReqs": false,
      "power": "40",
      "note": " P40",
      "new": true
    },
    {
      "name": "Breathing Exercise",
      "category": "Mental Fortress",
      "desc": "\nYour sanity recovers more quickly once out of terrifying situations.\n",
      "stats": {
        "Health": 5
      },
      "rarity": "Common",
      "reqs": {
        "Willpower": "5"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Conquer Your Fears",
      "category": "Mental Fortress",
      "desc": "\nKilling the beings of the deep replenishes your sanity somewhat.\n",
      "stats": {
        "Sanity": 3
      },
      "rarity": "Common",
      "reqs": {
        "Willpower": "10"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Breathing Exercise"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Disbelief",
      "category": "Mental Fortress",
      "desc": "\nYou're resistant to the effects of Illusion magic.\n",
      "stats": {
        "Sanity": 5
      },
      "rarity": "Common",
      "reqs": {
        "Willpower": "25"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Ether Kit",
      "category": "Metamancer",
      "desc": "\nIt's extra Ether, do you need anything else?\n",
      "stats": {
        "Ether": 20
      },
      "rarity": "Common",
      "reqs": "None",
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Health Pack",
      "category": "Metamancer",
      "desc": "\nIt's extra health, do you need anything else? \n",
      "stats": {
        "Health": 10
      },
      "rarity": "Common",
      "reqs": "None",
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Shared Misery",
      "category": "Mindbreaker",
      "desc": "\nUsing a M1/Critical Attack on an enemy while losing sanity causes them to lose sanity.\n",
      "stats": {
        "Health": 3,
        "Sanity": 5
      },
      "rarity": "Common",
      "reqs": {
        "Willpower": "85"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Boulder Climb",
      "category": "Mountain Climber",
      "desc": "\nYour climb height increases when you slide jump.\n",
      "stats": {
        "Passive Agility": 1
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Padded Armor",
      "category": "Natural Armor",
      "desc": "\nYou take 5% less damage when your armor is broken. \n",
      "stats": {
        "Blunt Armor": 3
      },
      "rarity": "Common",
      "reqs": "None",
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Steel Scales",
      "category": "Natural Armor",
      "desc": "\nYou take an additional 5% less damage when your armor is broken. \n",
      "stats": {
        "Slash Armor": 3
      },
      "rarity": "Common",
      "reqs": "None",
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Padded Armor"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Captain Etrea",
      "category": "Navaen Nomad",
      "desc": "\nMoving while with a shield no longer slows you down.\n",
      "stats": {
        "Health": 3,
        "Carry Load": 4
      },
      "rarity": "Common",
      "reqs": {
        "Strength": "30",
        "Fortitude": "10"
      },
      "extraReqs": [
        {
          "type": "Equipped",
          "content": "Fists"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Equipped: Fists",
      "new": true
    },
    {
      "name": "Fast Blade",
      "category": "Nimble Blade",
      "desc": "\nExtend the speedboost off parrying.\n",
      "stats": {
        "Passive Agility": 1
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Successive Prediction",
      "category": "Omniscient",
      "desc": "\nPredicting an attack will briefly allow you to predict another.\n",
      "stats": {
        "Elemental Intensity": 3,
        "Ether": 10
      },
      "rarity": "Common",
      "reqs": {
        "Intelligence": "50",
        "Mantra": "Prediction"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Bodyguard Detail",
      "category": "Public Figure",
      "desc": "\nIf you're attacked in an allied territory, your allies will come rushing to your aid. \n",
      "stats": {
        "Ether": 3,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Charisma": "30"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Bodyguard Detail"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Celebrity",
      "category": "Public Figure",
      "desc": "\nYour reputation caps out higher.\n",
      "stats": {
        "Ether": 2
      },
      "rarity": "Common",
      "reqs": {
        "Charisma": "40"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Twisted Puppets",
      "category": "Puppet Master",
      "desc": "\nBodies affected by corpse explosion will lift into the air and track onto an enemy.\n",
      "stats": {
        "Elemental Intensity": 1,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Flamecharm": "75",
        "Shadowcast": "70"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Corpse Explosion"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Hungry Flames",
      "category": "Pyromancer",
      "desc": "\nWhen you have no Ether, consume Stomach and Water to instantly cast your next fire mantra. \n",
      "stats": {
        "Health": 3,
        "Elemental Intensity": 5
      },
      "rarity": "Common",
      "reqs": {
        "Flamecharm": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Shield Breaker",
      "category": "Raging Bull",
      "desc": "\nBlunt damage now deals full posture damage to shields. \n",
      "stats": {
        "Posture": 1,
        "Carry Load": 4
      },
      "rarity": "Common",
      "reqs": {
        "Strength": "60"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Unwavering Resolve",
      "category": "Raging Bull",
      "desc": "\nGetting parried punishes your posture 50% less.\n",
      "stats": {
        "Posture": 1,
        "Carry Load": 4,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Strength": "40"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Jolting Current",
      "category": "Rampant Static",
      "desc": "\nYour lightning attacks in water strike others near them with lightning. \n",
      "stats": {
        "Ether": 4,
        "Elemental Intensity": 4,
        "Health ": 3
      },
      "rarity": "Common",
      "reqs": {
        "Thundercall": "35"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Windwaker",
      "category": "Scholar of the Cloud",
      "desc": "\nCall upon a gust of wind to propel your boat even faster.\n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Galebreath": "1",
        "Reputation": "Good"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Jumpstart",
      "category": "Self-Shocker",
      "desc": "\nUsing Static Withdraw when not being carried shocks yourself increasing your ability to scale walls, speed and applies shock to all outgoing physical damage and damage taken. \n",
      "stats": {
        "Ether": 4,
        "Elemental Intensity": 4,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Thundercall": "30"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Static Withdraw"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Raging Static",
      "category": "Self-Shocker",
      "desc": "\nYour Jumpstart no longer gives you movement buffs, but your outgoing physical damage is increased. The self damage to activate it is lowered, along with your cooldown on Jumpstart. \n",
      "stats": {
        "Ether": 4,
        "Elemental Intensity": 4,
        "Health ": 3
      },
      "rarity": "Common",
      "reqs": {
        "Thundercall": "35"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Jumpstart"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Static Withdraw",
      "category": "Self-Shocker",
      "desc": "\nIf you get knocked for the first time, if someone tries to carry you, you can discharge and damage them, goes on cooldown after use. \n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Thundercall": "25"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Now You See Me",
      "category": "Shade",
      "desc": "\nYour stealth when crouching is increased. \n",
      "stats": {
        "Passive Agility": 1,
        "Health ": 3
      },
      "rarity": "Common",
      "reqs": {
        "Agility": "15"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Shadowcaster",
      "category": "Shadowcaster",
      "desc": "\nGrants you the ability to command shadows as a Shadowcaster.\n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Shadowcast": "1"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Adept Shadowcaster",
      "category": "Shadowcaster",
      "desc": "\nYou can now obtain 1-Star Leveled Shadowcaster Mantras.\n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Shadowcast": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Expert Shadowcaster",
      "category": "Shadowcaster",
      "desc": "\nYou can now obtain 2-Star Leveled Shadowcaster Mantras.\n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Shadowcast": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Master Shadowcaster",
      "category": "Shadowcaster",
      "desc": "\nYou can now obtain 3-Star Leveled Shadowcaster Mantras.\n",
      "stats": {
        "Health\n": 5
      },
      "rarity": "Common",
      "reqs": {
        "Shadowcast": "50"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Black Out",
      "category": "Shadowcaster",
      "desc": "\nBlock breaking an opponent obscures their vision with darkness more potent than your Shadow mantra. \n",
      "stats": {
        "Elemental Intensity": 5,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Shadowcast": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Blossoming Darkness",
      "category": "Shadowcaster",
      "desc": "\nEther drained during Shadow Roar increases the size of it. \n",
      "stats": {
        "Elemental Intensity": 1,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Shadowcast": "30",
        "Roar": "Shadow"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Fear",
      "category": "Shadowcaster",
      "desc": "\nEnemies will briefly hang in place when they run from you. \n",
      "stats": {
        "Elemental Intensity": 4
      },
      "rarity": "Common",
      "reqs": {
        "Shadowcast": "50"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Lasting Sorrow",
      "category": "Shadowcaster",
      "desc": "\nShadows last longer on your opponent. \n",
      "stats": {
        "Elemental Intensity": 4
      },
      "rarity": "Common",
      "reqs": {
        "Shadowcast": "50"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Sightless Still",
      "category": "Shadowcaster",
      "desc": "\nThe more a person is affected by your shadowcast the more you obscure their vision. \n",
      "stats": {
        "Elemental Intensity": 5,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Shadowcast": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Singularity",
      "category": "Shadowcaster",
      "desc": "\nEnemies will briefly hang in place when hit by a shadow move. \n",
      "stats": {
        "Elemental Intensity": 1,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Shadowcast": "40",
        "Out": "Locked"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Knight's Rally",
      "category": "Shieldmaster",
      "desc": "\nWhen using a shield, you ready your block more quickly after taking a hit. \n",
      "stats": {
        "Health": 4,
        "Sanity": 4
      },
      "rarity": "Common",
      "reqs": {
        "Fortitude": "35",
        "Willpower": "10"
      },
      "extraReqs": [
        {
          "type": "Equipped",
          "content": "Shield"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Equipped: Shield",
      "new": true
    },
    {
      "name": "Turtle Shell",
      "category": "Shieldmaster",
      "desc": "\nIf your shield is on your back, take reduced backstab damage and negate Spine Cutter.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Fortitude": "50",
        "Willpower": "10"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Knight's Rally"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Silencer's Edge",
      "category": "Silencer",
      "desc": "\nMeleeing a 'Suffocated' opponent will grant you a speed boost. \n",
      "stats": {
        "Elemental Intensity": 1,
        "Health ": 3
      },
      "rarity": "Common",
      "reqs": {
        "Galebreath": "50"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": "20",
      "note": " P20",
      "new": true
    },
    {
      "name": "Friends In High Places",
      "category": "Silvertongue",
      "desc": "\nYour connections often let you off the hook when you're in trouble with the law. Nepotism sure does pay! \n",
      "stats": {
        "Ether": 4,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Charisma": "20"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Snake Oil",
      "category": "Silvertongue",
      "desc": "\nOkay, the amount you're charging people for your items is getting downright criminal. But I'm just a talent description, I can't stop you. \n",
      "stats": {
        "Ether": 2
      },
      "rarity": "Common",
      "reqs": {
        "Charisma": "30"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Agitating Static",
      "category": "Static Weaver",
      "desc": "\nUsing Discovery of Fire will light nearby downed enemies aflame. \n",
      "stats": {
        "Ether": 4,
        "Reservoir ": 7
      },
      "rarity": "Common",
      "reqs": {
        "Flamecharm": "5",
        "Thundercall": "50"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Discovery of Fire"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Jumper Cables",
      "category": "Static Weaver",
      "desc": "\nGetting knocked with an active tether allows you to steal health from tethered targets and not get knocked. \n",
      "stats": {
        "Ether": 1,
        "Reservoir": 5,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Intelligence": "15",
        "Thundercall": "45"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Static Weaver"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Link Conduction",
      "category": "Static Weaver",
      "desc": "\nWhile you have active tethers your lightning mantras cost less ether. \n",
      "stats": {
        "Reservoir": 6,
        "Elemental Intensity": 4
      },
      "rarity": "Common",
      "reqs": {
        "Intelligence": "15",
        "Thundercall": "45"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Static Weaver"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Static Ace",
      "category": "Static Weaver",
      "desc": "\nUsing stream core with an active tether link targets your closest active link.\n",
      "stats": {
        "Ether": 4,
        "Reservoir": 7
      },
      "rarity": "Common",
      "reqs": {
        "Intelligence": "15",
        "Thundercall": "45"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Static Link https://trello.com/c/s6SrU5xL/462-static-link-static-weaver"
        },
        {
          "type": "Mantra",
          "content": "Lightning Stream"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req. Mantra Req.",
      "new": true
    },
    {
      "name": "Static Allure",
      "category": "Static Weaver",
      "desc": "\nHaving two active tethers will cause the previous tethered enemy to get magnetized to your newest tethered enemy, also increases the duration of tethers by 15 seconds. \n",
      "stats": {
        "Ether": 1,
        "Reservoir": 5,
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Intelligence": "15",
        "Thundercall": "40"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Static Link"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    },
    {
      "name": "Static Link",
      "category": "Static Weaver",
      "desc": "\nFlourishing an enemy creates a static link between you and your enemy. Your lightning stuns enemies for 1.5x as long. \n",
      "stats": {
        "Reservoir": 8,
        "Elemental Intensity": 4
      },
      "rarity": "Common",
      "reqs": {
        "Intelligence": "15",
        "Thundercall": "40"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Stormcaller Slash",
      "category": "Stormblade",
      "desc": "\nCall forth the fury of storms by pressing F at the end of your move.\n",
      "stats": "None",
      "rarity": "Common",
      "reqs": {
        "Thundercall": "1"
      },
      "extraReqs": [
        {
          "type": "Mantra",
          "content": "Lightning Blade"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Mantra Req.",
      "new": true
    },
    {
      "name": "Grasp On Reality",
      "category": "Sturdy Resolve",
      "desc": "\nDamage taken from insanity is reduced.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Fortitude": "5",
        "Willpower": "5"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Unfazed",
      "category": "Sturdy Resolve",
      "desc": "\nYou no longer shiver or panic when your sanity is at stake.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Fortitude": "50",
        "Willpower": "50",
        "on": "Grasp"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Herbivore",
      "category": "Survival Instinct",
      "desc": "\nYou gain more nutrition from eating plants.\n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Fortitude": "5"
      },
      "extraReqs": [
        {
          "type": "Locked out by",
          "content": "Carnivore"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Locks",
      "new": true
    },
    {
      "name": "Iron Gut",
      "category": "Survival Instinct",
      "desc": "\nYou have resistance against being poisoned by foods. \n",
      "stats": {
        "Health": 3
      },
      "rarity": "Common",
      "reqs": {
        "Fortitude": "10",
        "Up": "Throw"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Pack Mule",
      "category": "Survivor",
      "desc": "\nThe max quantity of carrying food has increased. \n",
      "stats": {
        "Health": 3,
        "Carry Load": 1
      },
      "rarity": "Common",
      "reqs": {
        "Fortitude": "5"
      },
      "extraReqs": [],
      "multipleReqs": false,
      "power": 0,
      "note": "",
      "new": true
    },
    {
      "name": "Pyromania",
      "category": "Inferno",
      "desc": "\nSelf-inflicted fire damage is reduced.\n",
      "stats": {
        "Elemental Intensity": 3
      },
      "rarity": "Common",
      "reqs": {
        "Flamecharm": "30"
      },
      "extraReqs": [
        {
          "type": "Talent",
          "content": "Agitating Spark"
        }
      ],
      "multipleReqs": false,
      "power": 0,
      "note": " Talent Req.",
      "new": true
    }
  ];
	let talentsCount = 0;
	function generate(text, avoid) {
		var parsedText = JSON.parse(text);		
		parsedText.forEach((card) => {
			let [name, category] = card.name.split(" | ");
			// Remove blacklisted talents
			if (!categoryBlacklist.includes(category) && !name.includes("Unbounded") && !talentBlacklist.includes(name) && !(name == avoid)) {
				// Getting reqs
				let reqIndex = card.desc.indexOf("Requirements (if known):\n---\n");
				let [statReqs, addReq1, addReq2] = card.desc.slice(reqIndex + 29, card.desc.indexOf("Talent Stats")).split("\n")
				let multipleReqs = false;
				if (statReqs.includes(" or ")) {
					multipleReqs = true;
					statReqs = statReqs.split(" or ");
				} else {
					statReqs = statReqs.split(", ");
				}
				let reqs = {};
				// Getting descs
				let desc = card.desc.slice(card.desc.indexOf("Talent Description:\n---\n") + 23, card.desc.indexOf("What It Does In-Game:"));
				let statText = card.desc.slice(card.desc.indexOf("Talent Stats:\n---\n") + 18, card.desc.indexOf("Talent Image") - 1);
				statText = statText.split(", ");
				let tStats = {};
				if (statText[0] == "--" || statText[0] == "") {
					tStats = "None";
				} else {
					statText.map(stat => {
						let amount = parseInt(stat.split(" ")[0].substring(1));
						let name = stat.split(" ")
						name.splice(0, 1);
						name = name.join(" ");
						tStats[name] = amount;
					})
				}
				//
				let note = "";
				let power = 0; let powerChecked = false;
				let extraReqs = [];
				statReqs.map((req) => {
					//console.log(req);
					if (!req.includes("https://")) {
						if (req == "None") {
							reqs = "None";
						} else {
							// Stat 
							let [amount, stat] = req.split(" ");
							if (stat == "Heavy") stat = "Heavy Wep.";
							if (stat == "Medium") stat = "Medium Wep.";
							if (stat == "Light") stat = "Light Wep.";
							//
							if (amount == "Power") {
								power = stat;
							} else {
								reqs[stat] = amount;
							}
							if (power > 0 && !powerChecked) {
								note += ` P${stat}`;
								powerChecked = true;
							}
						}
					} else if (req.includes("https://")) {
						// Adding talent reqs
						note += ` Talent Req.`;
						let talentName = req.split(": ")[1];
						extraReqs.push({type: "Talent", content: talentName.split(" - ")[0]});
					}
				})
				// Checking for mantra / equipped reqs
				function checkReqs(req) {
					if (!req == "") {
						if (req.includes("Mantra")) {
							note += ` Mantra Req.`;
							extraReqs.push({type: "Mantra", content: req.split(": ")[1]});
						} else if (req.includes("Equipped")) {
							note += ` Equipped: ${req.split(": ")[1]}` 
							extraReqs.push({type: "Equipped", content: req.split(": ")[1]});
						} else if (req.includes("Lock")) {
							note += ` Locks`
							extraReqs.push({type: req.split(": ")[0], content: req.split(": ")[1]});
						} else if (req.includes("Oath")) {
							note += ` Oath`
							extraReqs.push({type: "Oath", content: req.split(": ")[1]});
						}
					}
				}
				checkReqs(addReq1); checkReqs(addReq2);
				// Pushing talent into talents list
				let talent = {
					name: name,
					category: category,
					desc: desc,
					stats: tStats,
					rarity: avoid.split(" ")[0],
					reqs: reqs,
					extraReqs: extraReqs,
					multipleReqs: multipleReqs,
					power: power,
					taken: false,
					note: note,
					new: true,
				}
				talents.push(talent)
			}
		});
	}
	// Getting rollable mantras
	function generateMantras(text) {
		JSON.parse(text).forEach(card => {
			if (card.name == "Attunementless" || card.name == "Flamecharm" || card.name == "Frostdraw" || card.name == "Thundercall" || card.name == "Galebreath" || card.name == "Shadowcast" || card.name == "-------------------") {
				return;
			}
			//console.log(card.name);
			//
			let [mantraName, mantraDetails] = card.name.split(" | ");
			let [attunement, type, stars] = mantraDetails.split(" ");
			type = type.toLowerCase();
			if (attunement != "Attunementless") {
				if (stars == undefined) stars = "";
				mantras[type].push({
					name: mantraName,
					attunementless: false,
					reqs: {},
					type: attunement,
					stars: stars,
					taken: false
				})
			} else {
				let [__, stat, type] = mantraDetails.split(" ");
				type = type.toLowerCase();
				let stars = mantraDetails[mantraDetails.indexOf("★")]; if (stars == undefined) stars = "";
				let reqs = mantraDetails.substring(mantraDetails.indexOf("(") + 1, mantraDetails.indexOf(")")).split(", ");
				let actualReqs = {};
				reqs.map(req => {actualReqs[req.split(" ")[1]] = req.split(" ")[0]});
				mantras[type].push({
					name: mantraName,
					attunementless: true,
					reqs: actualReqs,
					type: type,
					stars: stars,
					taken: false
				})
			}
		})
	}
	let obtainableMantrasDisplay = {combat: [], mobility: [], support: []};
	function updateMantras(data) {
		// Loop through mantras to keep taken mantra
		let taken = []
		for (let mantraType in obtainables.mantras) {
			for (let i = 0; i < obtainables.mantras[mantraType].length; i++) {
				let mantra = obtainables.mantras[mantraType][i];
				if (!mantra.taken) {
					obtainables.mantras[mantraType].splice(i, 1);
					i--;
				} else {
					taken.push(mantra);
				};
			}
		}
		console.log(obtainables.mantras)
		// Loop through elements to see which mantra is obtainable
		for (let mantraType in mantras) {
			mantras[mantraType].map(mantra => {
				let pushedMantra = null;
				if (!mantra.attunementless) {
					let stat = stats.elem[mantra.type];
					let stars = mantra.stars.length;
					if (stat >= 1 && stars == 0) pushedMantra = mantra;
					if (stat >= 20 && stars == 1) pushedMantra = mantra;
					if (stat >= 30 && stars == 2) pushedMantra = mantra;
					if (stat >= 50 && stars == 3) pushedMantra = mantra;
				} else {
					// Check reqs
					let passed = true;
					for (let req in mantra.reqs) {
						mantra.reqs[req] = parseInt(mantra.reqs[req]);
						let mantraReq = mantra.reqs[req];
						if (stats.basic[req] == undefined) {
							if (req == "Heavy") req = "Heavy Wep.";
							if (req == "Medium") req = "Medium Wep.";
							if (req == "Light") req = "Light Wep.";
							if (stats.weapon[req] < mantraReq) passed = false;
						} else {
							if (stats.basic[req] < mantraReq) passed = false;
						}
					}
					if (passed) pushedMantra = mantra;
				}
				if (pushedMantra != null) {
					let passed = true;
					for (let mantraType in obtainables.mantras) {
						obtainables.mantras[mantraType].forEach((mantra, index) => {
							if (mantra.name == pushedMantra.name) passed = false;
						})
					}
					if (passed) obtainables.mantras[mantraType].push(mantra)
				};
				// Data
				if (data != undefined) {
					if (data.indexOf(mantra.name) != -1) mantra.taken = true;
				}
			})
		}
		console.log(obtainables.mantras)
		// Updating oath mantra if possible
		if (buildInfo.oath != "") {
			let info = oathsInfo[buildInfo.oath];
			for (let mantraType in info.mantras) {
				for (let mantra of info.mantras[mantraType]) {
					obtainables.mantras[mantraType].push({
						name: mantra,
						taken: false,
						stars: ""
					});
				}
			}
		}
		obtainableMantrasDisplay = obtainables.mantras;
	}
	//
	function getMantra(elem, mantra, mantraType) {
		if (!mantra.taken) {
			mantra.taken = true;
		} else {
			mantra.taken = false;
		}
		obtainableMantrasDisplay[mantraType] = [...obtainables.mantras[mantraType].filter(({taken}) => taken), ...obtainables.mantras[mantraType].filter(({taken}) => !taken)]
	}
	// Oath mantras
	function updateOath() {
		if (buildInfo.oath == "") return;
		let info = oathsInfo[buildInfo.oath];
		// Update the amount of 
		for (let slot in mantraSlots) {
			if (info.slots[slot] != undefined) {
				mantraSlots[slot] = baseMantraSlots[slot] + info.slots[slot]
			} else {
				mantraSlots[slot] = baseMantraSlots[slot];
			}
		}
		updateMantras();
		// 
	}
	// Shrine of order
	function order() {
		let total = 0;
		let divideBy = 0;
		let highestStat1 = "Strength";
		let highestStat2 = "";
		for (let statType in stats) {
			for (let statName in stats[statType]) {
				if (stats[statType][statName] != 0) {
					total += stats[statType][statName];
					divideBy++;
					//
					if (statName != highestStat1) {
						if (stats[statType][statName] > stats[statType][highestStat1]) {
							highestStat1 = statName;
							highestStat2 = highestStat1;
						}
					}
				}
			}
		}
		//
		if (highestStat2 != "") {
			total -= 2;
		} else {
			total -= 1;
		}
		//
		for (let statType in stats) {
			for (let statName in stats[statType]) {
				if (stats[statType][statName] != 0) {
					stats[statType][statName] = Math.floor(total / divideBy);
					if (statName == highestStat1 && highestStat2 == "") {
						stats[statType][statName] += 2;
					} else if (statName == highestStat1 || statName == highestStat2) {
						stats[statType][statName] += 1;
					}
				}
				
			}
		}
		updateActualStats();
	}
	// Fetching talents
	var auth = {};
	auth = {key: env.PUBLIC_TRELLO_API_KEY, token: env.PUBLIC_TRELLO_USER_TOKEN};
	var mantraList = "63236a2ae478db0156a9bf6d";
	var lists = {
		"Advanced Talents": "63a51417e115dc007d9eb48d",
		"Rare Talents": "62ad54ee5b99ba4f63ccb467",
		"Common Talents (Index A-D)": "62ad54f4c88e490f6670db7b",
		"Common Talents (Index E-L)": "62afe2bd39dfb612c3b63cec",
		"Common Talents (Index M-S)": "62afe2f6a2006e41efc383fd",
		"Common Talents (Index T-Misc.)": "62afe2ff1ff4a37fdee1369d"
	}
	// Fetch cards
	fetch(`https://api.trello.com/1/boards/fRWhz9Ew/lists?key=${auth.key}&token=${auth.token}`, {method: "GET"})
			.then(res => {return res.text()})
			.then(text => {console.log(text)})
	// Loop through all the lists to generate 
	let fetches = []
	for (let listsName in lists) {
		fetches.push(
		fetch(`https://api.trello.com/1/lists/${lists[listsName]}/cards?key=${auth.key}&token=${auth.token}`, {method: "GET"})
			.then(res => {return res.text()})
			//.then(text => {generate(text, listsName)})
			.then(text => {console.log(text)})
			//.then(console.log(talents))
			.catch(err => console.error(err))
		)
	}
	// Mantra fetching
	fetches.push(
		fetch(`https://api.trello.com/1/lists/${mantraList}/cards?key=${auth.key}&token=${auth.token}`, {method: "GET"})
			.then(res => {return res.text()})
			.then(text => {generateMantras(text)})
			//.then(console.log(talents))
			.catch(err => console.error(err))
	)
	Promise.all(fetches).then(function() {
		// Generate intial talents
		updateTalents();
		// Load existing data if url has id
		if ($page.url.searchParams.has("id")) {
			let id = $page.url.searchParams.get("id");
			let docRef = doc(db, "builds", id);
			getDoc(docRef).then(docSnap => {
				if (docSnap.exists()) {
					let data = docSnap.data();
					buildInfo = data.buildInfo;
					//
					talents.map(talent => {
						if (data.taken.talents.indexOf(talent.name) != -1) {
							if (takenTalents[talent.category] == undefined) takenTalents[talent.category] = [];
							takenTalents[talent.category].push(talent);
						}
					})
					//
					for (let statType in stats) {
						for (let stat in stats[statType]) {
							stats[statType][stat] = data.stats[statType][stat];
						}
					}
					//
					for (let category in takenTalents) {
						takenTalentsCount += takenTalents[category].length;
					}
					//
					updateMantras(data.taken.mantras);
					updateActualStats(true);
					updateTalents();
					//
				} else {
					alert("No build found with requested ID!")
				}
			})
		}
  	});
	function makeId(length) {
		var result           = '';
		var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		var charactersLength = characters.length;
		for (let i = 0; i < length; i++ ) {
			result += characters.charAt(Math.floor(Math.random() * charactersLength));
		}
		return result;
	}
	// Exporting
	function exportBuild() {
		console.log("attempting to export")
		// Basic validations and sanitation
		if (buildInfo.name == "" || buildInfo.desc == "") {
			alert("Please fill out some build info.") 
			return
		};
		let id = makeId(8);
		let docRef = doc(db, "builds", id);
			getDoc(docRef).then(docSnap => {
				if (docSnap.exists()) {
					console.log("build with id exists, retrying");
					exportBuild();
				} else {
					console.log("unique id found, running")
					// Process data
					let taken = {talents:[], mantras: []};
					for (let category in takenTalents) {
						takenTalents[category].map(talent => taken.talents.push(talent.name));
					}
					for (let category in obtainables.mantras) {
						obtainables.mantras[category].map(mantra => {if (mantra.taken) taken.mantras.push(mantra.name)})
					}
					let data = {
						taken: taken,
						stats: stats,
						buildInfo: buildInfo
					}
					setDoc(doc(db, "builds", id), data)
					navigator.clipboard.writeText(`https://deepwoken-builder.vercel.app/?id=${id}`).then(function() {
						alert("Build link copied to clipboard!");
						console.log('Async: Copying to clipboard was successful!');
					}, function(err) {
						console.error('Async: Could not copy text: ', err);
					});
				}
			})
	}
</script>
<style>
	body {
		padding: 10px;
		background: url(/background.png) repeat;
		overflow: hidden;
	}
	.wrapper {
		position: fixed;
		left: 2vw;
		top: 5vh;
		border: 15px solid;
		border-image: url(/border.png) 45%;
		background-color: #E5E0CA;
		font-family: "Lora", serif;
		font-size: 15px;
		color: black;
	}
	.stat-wrapper {
		width: 45%;
		font-weight: 600;
		height: 30vh;
	}
	.stats {
		display: flex;
		position: fixed;
		width: inherit;
		left: 2.75vw;
		top: 12vh;
	}
	.stat {
		width: 30%;
		border-right: 1px solid rgba(0, 0, 0, 0.5);
		/*border-image: url(./border.png) 45%;*/
		margin: 2%;
	}
	.stat-item {
		position: relative;
		margin: 6px 3px;
	}
	.stat-input {
		float: right;
		width: 25%;
		height: 10%;
		right: 0;
		font-family: "Lora", "sans-serif";
		border: 1px solid black;
		border-radius: 5px;
		font-size: 14px;
		padding: 1px;
	}
	.stat-input:focus {
		outline: none;
		box-shadow: 0px 0px 5px black;
	}
	#elems {
		border: none;
	}
	/* Talents */
	#searchTalents {
		display: block;
		text-align: center;
		width: 30%;
		margin: auto;
		margin-top: 5px;
		margin-bottom: 5px;
		padding: 5px;
	}
	.talents-wrapper {
		position: fixed;
		top: 42.5vh;
		left: 2vw;
		width: 45%;
		height: 50vh;
	}
	.talents-categories {
		display: flex;
		height: 92%;
	}
	.talents-category {
		text-align: center;
		width: 33%;
	}
	#rare {
		border-right: 1px solid rgba(0, 0, 0, 0.5);
		border-left: 1px solid rgba(0, 0, 0, 0.5);
	}
	.talents {
		text-align: left;
		height: 85%;
		overflow-y: scroll;
		overflow-x: hidden;
	}
	fieldset { 
		border: none;
		border-top: 1px solid rgba(0, 0, 0, 0.5);
		color:rgba(0, 0, 0, 0.5);
		padding: 0px 0px 0px 15px;
	}
	.name {
		padding: 2px 5px;
	}
	.note {
		color: rgba(0, 0, 0, 0.25);
	}
	/* Obtained Talents */
	.obtained-wrapper {
		position: fixed;
		left: 50vw;
		height: 87.5vh;
		width: 14vw;
	}
	.obtained-talents {
		margin-top: 7vh;
		height: 90%;
		padding: 5px;
	}
	#rare-talent {
		color: rgb(202, 27, 79)
	}
	#advanced-talent {
		color: rgb(56, 211, 115)
	}
	/* Build info */
	.build-info {
		position: fixed;
		left: 67vw;
		width: 30vw;
		height: 25vh;
	}
	#build-name {
		position: fixed;
		left: 69.25vw;
		width: 25%;
		height: 2%;
		text-align: center;
		background-color: transparent;
		border: 10px solid;
		font-family: "Lora", "sans-serif";
		font-size: 20px;
		font-weight: 600;
		border-image: url(/border.png) 45%;
		padding: 5px;
	}
	#build-name:focus, #build-description:focus {
		outline: none;
		box-shadow: 0px 0px 5px black;
	}
	#build-description {
		position: fixed;
		resize: none;
		width: 28%;
		left: 67.9vw;
		top: 15vh;
		height: 9%;
		font-size: 13px;
		background-color: transparent;
		border: 15px solid;
		border-image: url(/border.png) 45%;
		font-family: "Lora", "sans-serif";
	}
	#oaths, #murmurs{
		position: fixed;
		top: 29.5vh;
	}
	#oaths {left: 68vw}
	#murmurs {left: 79vw}
	/* Mantras */
	.mantras {
		position: fixed;
		display: flex;
		left: 67vw;
		top: 37.5vh;
		height: 29vh;
		width: 30vw;
	}
	.mantras-category {
		width: 33%;
		padding: 5px;
		margin-top: 4.5vh;
	}
	.mantra {
		color:rgba(0, 0, 0, 0.75)
	}
	#mobility {
		border-right: 1px solid rgba(0, 0, 0, 0.5);
		border-left: 1px solid rgba(0, 0, 0, 0.5);
	}
	/* Overview */
	.overview {
		position: fixed;
		left: 67vw;
		top: 74vh;
		height: 18.5vh;
		width: 13vw;
	}
	#export, #order {
		position: fixed;
		top: 29vh;
		left: 90vw;
		width: 8%;
		font-family: "Lora", "sans-serif";
		border: 1px solid;
		border-image: url(/border.png) 45%;
		padding: 5px 0px;
		border-image-width: 15px;
		background-color: rgb(0, 32, 10);
		color: white;
	}
	#order {
		top: 7.5vh;
		left: 39vw;
	}
	#export:hover {
		box-shadow: 0px 0px 10px black;
	}
	.stat-overview {
		margin-top: 3vh;
		overflow-y: scroll;
		height: 85%;
	}
	/* Credits */
	.credits {
		position: fixed;
		left: 84vw;
		top: 74vh;
		width: 13vw;
		height: 18.5vh;
	}
	a {
		display: block;
	}
	p {
		margin-top: 4vh;
	}
  .announcement {
    position: fixed;
    width: 100%;
    top: 0px;
    margin-top: 0vh;
    color: white;
    font-size: 25px;
    text-align: center;
    font-family: 'Lora', sans-serif;
  }
</style>

<body on:mousemove={checkTooltips}>
  <a class="announcement" href="https://deepwoken.co/builder"> Check out the new v2 builder here!</a>
	<!-- Stats -->
	<div class="wrapper stat-wrapper">
		<h3 style="text-align: center; margin: 0; position: fixed; top: 8vh; left: 23vw;"> Stats <i class="note">{currentPower}</i></h3>
		<div class="stats">
			{#each Object.entries(stats) as [statType, statDetails]}
				<div id={statType} class="stat">
					{#each Object.entries(stats[statType]) as [statName, statValue]}
						<div class="stat-item"> 
							{statName} <input {statName} statType={statType} type="number" class="stat-input" on:change={updateStats} value={statValue}>
						</div>
					{/each}
				</div>
			{/each}
		</div>
		<p style="text-align:center; margin: 0; font-weight: 200; position: fixed; top: 33.5vh; left: 20vw;">Investment Points: <b style="font-weight: 700">{points}</b></p>
	</div>
	<button id="order" on:mousedown={order}>Shrine of Order</button>
	<!-- Talents -->
	<div class="wrapper talents-wrapper">
		<h3 style="text-align: center; margin: 0"> Talents <i class="note">{talentsCount}</i></h3>
		<input id="searchTalents" placeholder="Talents are back, fixing live talent updates." on:input={updateSearch} style="border: 10px solid; padding: 0; border-image: url(/border.png) 45%;">
		<div class="talents-categories">
			{#each Object.entries(obtainables.talents) as [rarity]}
				<div class="talents-category">
					{rarity}
					<div class="talents">
						{#each Object.entries(obtainables.talents[rarity]) as [category, talents]}
							<fieldset>
								<legend><i>{category}</i></legend>
							</fieldset>
							{#each talents as talent (talent)}
								{#if talent.new}
									<div class="name" use:tooltip={talent} on:mousedown={getTalent(category, talent, true)}>
										<span>{talent.name} <span class="note" style="color:red"> •</span><i class="note">{talent.note}</i><br></span>
									</div>
								{:else}
									<div class="name" use:tooltip={talent} on:mousedown={getTalent(category, talent, true)}>
										<span>{talent.name}<i class="note">{talent.note}</i><br></span>
									</div>
								{/if}
							{/each}
						{:else}
							<br />
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
	<!-- Obtained talents-->
	<div class="wrapper obtained-wrapper">
		<h3 style="text-align: center; margin: 0; position: fixed; top: 8vh; left: 52.5vw;"> Obtained Talents <i class="note">{takenTalentsCount}</i></h3>
		<h3 style="text-align: center; font-size: 14px; margin: 0; position: fixed; top: 11vh; left: 52vw;"><i class="note">Click on talents to get them!</i></h3>
		<div class="obtained-talents talents">
			{#each Object.entries(takenTalents) as [category, talents] (talents)}
				<fieldset>
					<legend><i>{category}</i></legend>
				</fieldset>
				{#each talents as talent (talent.name)}
					<div class="name" use:tooltip={talent} on:mousedown={getTalent(category, talent, false)}>
						<span id="{talent.rarity.toLowerCase()}-talent">{talent.name}<i class="note">{talent.note}</i><br></span>
					</div>
				{/each}
			{:else}
				<br />
			{/each}
		</div>
	</div>
	<!-- Build stuff -->
	<div class ="wrapper build-info">
		<b><input id="build-name" placeholder="Build name..." bind:value={buildInfo.name} selected></b>
		<textarea id="build-description" placeholder="Build description..." bind:value={buildInfo.desc}></textarea>
		<div id="oaths">Oath: <select bind:value={buildInfo.oath} on:change={updateOath}>Oath:
			{#each oaths as mm}
				<option>{mm}</option>
			{/each}
		</select></div>
		<div id="murmurs">Murmur: <select bind:value={buildInfo.murmur}>
			{#each murmurs as mm}
				<option>{mm}</option>
			{/each}
		</select></div>
		<button id="export" on:mousedown={exportBuild}>Export</button>
	</div>
	<!-- Mantras -->
	<div class="wrapper mantras">
		<h3 style="text-align: center; margin: 0; position: fixed; top: 39vh; left: 77.5vw;"> Mantras <i class="note">(Wildcard: {mantraSlots.wildcard})</h3>
		<h3 style="text-align: center; margin: 0; position: fixed; top: 41.5vh; left: 77vw; font-size:14px"><i class="note">Click on mantras to get them!</i></h3>
		{#each Object.entries(obtainableMantrasDisplay) as [type, mantras] (mantras)}
			<div style="text-align: center" class="mantras-category" id={type}>{type.charAt(0).toUpperCase() + type.slice(1)} <i class="note">({mantraSlots[type]})</i>
				<div class="talents">
					{#each mantras as mantra}
						{#if mantra.taken} 
							<div class="talent mantra" on:mousedown={getMantra(this, mantra, type)} style="font-weight: 700; color:black">{mantra.name} {mantra.stars}</div>
						{:else}
							<div class="talent mantra" on:mousedown={getMantra(this, mantra, type)}>{mantra.name} {mantra.stars}</div>
						{/if}
					{/each}
				</div>
			</div>
		{/each}
	</div>
	<!-- Overview -->
	<div class="wrapper overview">
		<h3 style="text-align: center; margin: 0; position: fixed; top: 76vh; left: 71.75vw;"> Overview </h3>
		<div class="stat-overview">
			{#each Object.entries(talentStats) as [statName, statAmount]}
				<span>+<b>{statAmount}</b> {statName}</span><br>
			{/each}
		</div>
	</div>
	<!-- Credits -->
	<div class="wrapper credits">
		<h3 style="text-align: center; margin: 0; position: fixed; top: 76vh; left: 89.5vw;"> Credits </h3>
		<p>By Cyfer#2380. This site will eventually be taken down in favor of V2! Thank you for your support.</p>
		<a target="_blank" href="https://discord.gg/deepwokeninfo">Deepwoken Info Discord</a>
		<a target="_blank" href="https://trello.com/b/fRWhz9Ew/deepwoken-talent-list">Trello</a>
	</div>
	<!-- Footer -->
	<p class="footer" style="position: fixed; bottom: -5px; right: 10px; color: white; font-family: 'Lora', 'sans-serif'; font-size: 12px">v1.1.9 - Oath update with various fixes. The next update will be minor (races, undo button, etc.) to prepare for v2.0!!</p>
</body>