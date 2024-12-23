const {
    canAdventure,
    toLocation,
    print,
    toInt,
    setCcs,
    haveEffect,
    cliExecute,
    urlEncode,
    xpath,
    retrieveItem,
    toEffect,
    setAutoAttack,
    getCampground,
    getAutoAttack,
    toItem,
    mallPrice,
    abort,
    numericModifier,
    toElement,
    toSlot,
    equippedItem,
    equip,
    getProperty,
    visitUrl,
    adv1,
    myTurncount,
    itemAmount,
    useFamiliar,
    toFamiliar,
    myFullness,
    myInebriety,
    inebrietyLimit,
    fullnessLimit,
    myFamiliar,
    eat,
    drink,
    setProperty,
    use,
    useSkill,
    toSkill,
    myAdventures,
    putCloset,
    equippedAmount,
} = require('kolmafia');

// ---------------------------------------------
// ---- PART ONE: SET CONSTANTS ----------------
// ---------------------------------------------

// This checks/sets the _valueOfSpirit property. If the pref doesn't 
//   exist, set it to 3500, the value I am assessing at.
var propValue = toInt(getProperty("_valueOfSpirit"));

if (propValue === 0) {
    setProperty("_valueOfSpirit", 3500);
}

// This allows users to set their own spirit values.
const VALUEOFSPIRIT = toInt(getProperty("_valueOfSpirit"));

// Item-generated buffs & price over which the item should not be bought
//   My math for this is pretty back-of-the-envelope. Assuming a value of
//   spirits at 3-4k (which seems fair), 1 point of NC means +1 NC per 100
//   turns, so +7 or so over a 700 turn day. So, value of 1% NC is:
//      val(NC) = # NCs * extra spirit * spirit val = 7 * (11-2) * 3500 = 220k
//   And if 1% is worth 220k over the whole day, these are the prices at
//   which the various NC buffs stop being worth it to snag. To simplify,
//   on a potion by potion basis, you can calculate with:
//      ((%ncadded)/100.0)*potionturns*(VALUEOFSPIRIT*(11-2));

// Stench res is more complicated, but a similar equation sort of works. 
//   There are deeper diminishing returns on stench res, but for gross
//   approximation, 5 stench res is worth #NCs * spirit. That means...
//      val(RES) = # NCs * spirit val / 5 = 245 * 3500 / 5 = 170k
//   Which lead to the following, assuming full NC rate:
//      ((35/100)*potionturns)*(.275)*(res)*(VALUEOFSPIRIT)

const NCBUFFS = {
    'Become Superficially Interested': ((1)/100.0)*100*(VALUEOFSPIRIT*(11-2)),  // 5 nc; 100 turns
    'Gummed Shoes':((1)/100.0)*50*(VALUEOFSPIRIT*(11-2)),                       // 5 nc; 50 turns
    'Cocoa-Buttery': ((1)/100.0)*20*(VALUEOFSPIRIT*(11-2)),                     // 5 nc; 20 turns
    'Feeling Sneaky': ((1)/100.0)*20*(VALUEOFSPIRIT*(11-2)),                    // 5 nc; 20 turns
    'Fresh Scent': ((1)/100.0)*11*(VALUEOFSPIRIT*(11-2)),                       // 5 nc; 11 turns
    'Predjudicetidigitation': ((2)/100.0)*10*(VALUEOFSPIRIT*(11-2)),                       // 10 nc; 10 turns
    'Ultra-Soft Steps':((1)/100.0)*5*(VALUEOFSPIRIT*(11-2)),                    // 5 nc; 5 turns
    'Snow Shoes':((1)/100.0)*30*(VALUEOFSPIRIT*(11-2)),                    // 5 nc; 30 turns
    'Resined': 2000,                                               // leaves, included bc leaf balm exists
};

const RESBUFFS = {
    'Covered in the Rainbow': ((35/100)*80)*(.275)*(2)*(VALUEOFSPIRIT), // 2 all res, 80 turns
    'Minor Invulnerability': ((35/100)*30)*(.275)*(3)*(VALUEOFSPIRIT),  // 3 all-res, 30 turns
    'Autumnically Balmy':((35/100)*30)*(.275)*(2)*(VALUEOFSPIRIT),      // 2 all-res, 30 turns
    'Oiled-Up': ((35/100)*20)*(.275)*(2)*(VALUEOFSPIRIT),               // 2 all res, 20 turns
    'Red Door Syndrome': ((35/100)*10)*(.275)*(2)*(VALUEOFSPIRIT),      // 2 all res, 10 turns
    // 'Incredibly Healthy':6000,      // 3 all-res, 5 turns
}

const STENCHBUFFS = {
    'On Smellier Tides': ((35/100)*20)*(.275)*(1)*(VALUEOFSPIRIT),      // 1 stench res, 20 turns
    'Smelly Pants': ((35/100)*10)*(.275)*(1)*(VALUEOFSPIRIT),           // 1 stench res, 10 turns  
    'Cold Hands': ((35/100)*20)*(.275)*(2)*(VALUEOFSPIRIT), // 2 stench res, 20 turns 
    'Sleazy Hands': ((35/100)*20)*(.275)*(2)*(VALUEOFSPIRIT), // 2 stench res, 20 turns  
};

const SLEAZEBUFFS = {
    'Boisterous Oysterous': ((35/100)*20)*(.275)*(1)*(VALUEOFSPIRIT),  // 1 sleaze res, 20 turns
    'Sleaze-Resistant Trousers': ((35/100)*10)*(.275)*(1)*(VALUEOFSPIRIT), // 1 sleaze res, 10 turns               
    'Slimed Stomach': ((35/100)*10)*(.275)*(1)*(VALUEOFSPIRIT), // 1 sleaze res, 5 turns               
    'Cold Hands': ((35/100)*20)*(.275)*(2)*(VALUEOFSPIRIT), // 2 sleaze res, 20 turns               
    'Spooky Hands': ((35/100)*20)*(.275)*(2)*(VALUEOFSPIRIT), // 2 sleaze res, 20 turns               
};

const HOTBUFFS = {
    'Stinky Hands': ((35/100)*20)*(.275)*(2)*(VALUEOFSPIRIT), // 2 hot res, 20 turns               
    'Sleazy Hands': ((35/100)*20)*(.275)*(2)*(VALUEOFSPIRIT), // 2 hot res, 20 turns               
    'Flame-Retardant Trousers': ((35/100)*10)*(.275)*(1)*(VALUEOFSPIRIT), // 1 hot res, 10 turns               
    'Too Cool for (Fish) School': ((35/100)*20)*(.275)*(1)*(VALUEOFSPIRIT), // 1 hot res, 10 turns  
};

const COLDBUFFS = {
    'Hot Hands': ((35/100)*20)*(.275)*(2)*(VALUEOFSPIRIT), // 2 cold res, 20 turns 
    'Hot in Herre': ((35/100)*30)*(.275)*(5)*(VALUEOFSPIRIT), // 5 cold res, 30 turns
    'Inflamed With Shadows': ((35/100)*100)*(.275)*(3)*(VALUEOFSPIRIT), // 3 cold res, 100 turns
    'Spooky Hands': ((35/100)*20)*(.275)*(2)*(VALUEOFSPIRIT), // 2 cold res, 20 turns
    'Insulated Trousers': ((35/100)*10)*(.275)*(1)*(VALUEOFSPIRIT), // 1 cold res, 10 turns  
    'Burning Hands': ((35/100)*10)*(.275)*(3)*(VALUEOFSPIRIT), // 3 cold res, 10 turns               
    'Shells of the Damned': ((35/100)*20)*(.275)*(1)*(VALUEOFSPIRIT), // 1 cold res, 20 turns  
};

const SPOOKYBUFFS = {
    'Hot Hands': ((35/100)*20)*(.275)*(2)*(VALUEOFSPIRIT), // 2 spooky res, 20 turns               
    'Hot in Herre': ((35/100)*30)*(.275)*(5)*(VALUEOFSPIRIT), // 5 spooky res, 30 turns
    'Inflamed With Shadows': ((35/100)*100)*(.275)*(3)*(VALUEOFSPIRIT), // 3 spooky res, 100 turns
    'Stinky Hands': ((35/100)*15)*(.275)*(2)*(VALUEOFSPIRIT), // 2 spooky res, 20 turns  
    'Spookypants': ((35/100)*5)*(.275)*(1)*(VALUEOFSPIRIT), // 1 spooky res, 10 turns
    'Worst Willy': ((35/100)*20)*(.275)*(1)*(VALUEOFSPIRIT), // 1 spooky res, 20 turns
};

// Map the islands to the res you should grab.
const ISLANDRESMAP = {
    "easter":"stench",
    "patrick":"sleaze",
    "vets":"hot",            
    "thanks":"cold",    
    // "xmas":"spooky",        
};

// Map the island snarfblats 
const ISLANDSNARFBLATS = {
    "easter":588,
    "patrick":589,
    "vets":590,
    "thanks":591,
    "xmas":592,
};

// Map the correct dread food/drink to the right element
    //                     COL HOT STE SLE SPO
    //   Dreadful Chill =>          X   X      => Cold Pocket,  Cold-Fashioned
    //   Dreadful Heat  =>  X               X  => Hot Pocket, Hot Toddy
    //   Dreadful Fear  =>  X           X      => Spooky Pocket, Grimlet
    //   Dreadful Sheen =>      X   X          => Sleaze Pocket, Slithery Nipple
    //   Dreadful Smell =>      X           X  => Stink Pocket, Dank and Stormy

    const DREADDRINK = {
        "Dreadful Chill":"Dreadsylvanian Cold-Fashioned",
        "Dreadful Heat":"Dreadsylvanian Hot Toddy",
        "Dreadful Fear":"Dreadsylvanian Grimlet",
        "Dreadful Sheen":"Dreadsylvanian Slithery Nipple",
        "Dreadful Smell":"Dreadsylvanian Dank and Stormy",
    };

    const DREADPOCKET = {
        "Dreadful Chill":"Dreadsylvanian Cold Pocket",
        "Dreadful Heat":"Dreadsylvanian Hot Pocket",
        "Dreadful Fear":"Dreadsylvanian Spooky Pocket",
        "Dreadful Sheen":"Dreadsylvanian Sleaze Pocket",
        "Dreadful Smell":"Dreadsylvanian Stink Pocket",
    };

// Buffs cast by the user; if you don't have one, comment it out I guess.
const CASTBUFFS = [
    toEffect('Elemental Saucesphere'),
    toEffect('Astral Shell'),
    toEffect('Smooth Movements'),
    toEffect("Singer's Faithful Ocelot"),
    toEffect("Empathy"),
    // toEffect("Blood Bond"),
    toEffect("Leash of Linguini"),
    // toEffect("Blood Bubble"),
    toEffect("Springy Fusilli"),
    // toEffect("Scarysauce"),
    toEffect("The Sonata of Sneakiness"),
    toEffect("Phat Leon's Phat Loot Lyric"),
];

// This is a simple CCS.
const RAWCOMBAT = [
    "pickpocket",
    "if hasskill 7449",          // if eagle equipped, & you can pledge... pledge
    "skill 7449",
    "endif",
    "while !times 1; attack; endwhile", 
    "if hasskill Bowl a Curveball",
    "skill bowl a curveball",
    "endif",
    "if hasskill spring away",
    "skill spring away",
    "endif",
    "if hasskill 7423",        // parka YR
    "skill 7423",    
    "endif",
    "if hasskill 7521",        // dart freekill
    "skill 7521",
    "endif",
    "if hasskill 7265",        // jokester
    "skill 7265",      
    "endif",
    "if hasskill 0149",        // shatterpunch
    "skill 0149",
    "endif",
    "if hasskill 7307",        // chest xray
    "skill 7307",
    "endif",
    "if hasskill 163",         // ginger mob hit
    "skill 163",
    "endif",
    "if hasskill 7530",        // swoop like a bat
    "skill 7530",
    "endif",
    "if hasskill 7424",        // spikolodon spikes
    "skill 7424",
    "endif",
    "if hascombatitem shadow brick",
    "use shadow brick",
    "endif",
    "skill curse of weaksauce",
    "attack",
    "skill silent treatment",
    "skill saucegeyser",
    "attack",
    "repeat",
];

/**
 * Startup tasks when script begins. It's like breakfast! Except, for a script.
 */
function ahoyMaties() {
    // Use horsery for dark horse, because -com potions are gone and a marginal 
    //   accessory is +5 res vs -1 combat
    if (getProperty("horseryAvailable") === "true") {
        if (getProperty("_horsery") != "dark horse") cliExecute("horsery dark horse");
    }

    // Grab a fish hatchet from the floundry.
    if (getProperty("_floundryItemCreated") === "false") {
        cliExecute("acquire 1 fish hatchet");
    }

    // Grab a deft pirate hook.
    if (itemAmount(toItem("deft pirate hook")) === 0 && equippedAmount(toItem("deft pirate hook")) === 0) {
        if (toItem("TakerSpace letter of Marque") in getCampground()) {
            cliExecute("acquire 1 deft pirate hook");
        }
    }

    // Properly set up your retrocape.
    if (getProperty("retroCapeSuperhero") != "vampire" && getProperty("retroCapeWashingInstructions") != "hold") {
        cliExecute("retrocape vampire hold");
    }

    // For simplicity, just use peace turkey.
    useFamiliar(toFamiliar("Disgeist"));

    // Get the barrel buff, if you have it.
    if (getProperty("barrelShrineUnlocked") === true) {
        if (getProperty("_barrelPrayer") === "false") cliExecute("barrelprayer buff");
    }

    var bricksNeeded = 13 - toInt(getProperty("_shadowBricksUsed"));

    // Closet all shadow bricks.
    if (itemAmount(toItem("shadow brick")) > bricksNeeded) {
        putCloset(toItem("shadow brick"), itemAmount(toItem("shadow brick"))-bricksNeeded);
    }

    // ... then retrieve the # you can use!
    if (toInt(getProperty("_shadowBricksUsed")) < bricksNeeded) {
        retrieveItem(toItem("shadow brick"), 13 - toInt(getProperty("_shadowBricksUsed")));
    }

    // Use milk, if appropriate. 
    if (getProperty("_milkOfMagnesiumUsed") === "false") use(toItem("Milk of Magnesium"));

    // Set default choice advs appropriately
    if (getProperty("choiceAdventure1538") != 2) cliExecute("set choiceAdventure1538 = 2");
    if (getProperty("choiceAdventure1539") != 2) cliExecute("set choiceAdventure1539 = 2");    if (getProperty("choiceAdventure1539") != 2) cliExecute("set choiceAdventure1539 = 2");
    if (getProperty("choiceAdventure1540") != 2) cliExecute("set choiceAdventure1540 = 2");
    if (getProperty("choiceAdventure1541") != 2) cliExecute("set choiceAdventure1541 = 2");

}

/**
 * Execute sources for buffs up to a given # of turns.
 * @param {number} turns        # of turns to buff to
 * @param {Effect[]} buffs      buffs to execute 
 */
function executeBuffs(turns, buffs) {
    // I wish this batch submitted
    buffs.forEach((buff) => {
        
        // Ensure the buff isn't some stupid empty element
        if (typeof buff.default === 'string') {

            // Iterate until you have the desired # of turns of the buff
            for (let i = 0; haveEffect(buff) < turns; i++ ) {
                // Variable for buff turns prior to executing the CLIEX.
                var buffTurns = haveEffect(buff);
                
                // Use the dumb cli execute strategy
                cliExecute("try; "+ buff.default);

                if (buffTurns === haveEffect(buff)) {
                    abort("Failed to buff up with "+buff+". Weird! Maybe comment it out or do it yourself?");
                }

                // If this gets stuck in a infinite loop, shut the thing off and alert user.
                if (i > 100000) {
                    abort("Attempts to gain "+buff+" failed. A lot!!! Comment it out and try again?");
                }
            }
        }
    });
}

/**
 * Accepts a list of buff/val pairs and generates an Effect[] list
 * of buffs within acceptable price ranges.
 * @returns {Effect[]} buffs    properly-priced buffs
 */
function effectFilter(buffValPairs) {
    var properPriceBuffs = [];

    // Then, make sure item buffs are acceptable prices. If so, use them.
    Object.keys(buffValPairs).forEach((buffString) => {
        var buff = toEffect(buffString);
        var buffItem = toItem(buff.all[0].split("1")[1]);
        var buffPrice = mallPrice(buffItem);
        if (buffPrice > buffValPairs[buff]) {
            print(buff+" source, "+buffItem+" is "+buffPrice+" meat -- that's too rich for our max price ("+buffValPairs[buff]+").");
        } else {
            properPriceBuffs.push(buff);
        }
    });

    return properPriceBuffs;

}

/**
 * Iterates through a series of buff/price points and adds them to a broader 
 *   effect list to put into executeBuffs
 * @returns {Effect[]} buffs    cost-effective buffs to pick up
 */
function priceCheck(island) {

    // First, load up your casting buffs; you always want to check those.
    var buffList = CASTBUFFS;
    var userNC = numericModifier("Combat Rate");
    var userRES = numericModifier(toElement(ISLANDRESMAP[island])+" resistance");

    // If the user isn't already capping, check buff lists. Otherwise, skip.
    if (userNC  > -35) buffList = buffList.concat(effectFilter(NCBUFFS));
    if (userRES <  40) {
        buffList = buffList.concat(effectFilter(RESBUFFS));
        if (ISLANDRESMAP[island] === "stench") buffList = buffList.concat(effectFilter(STENCHBUFFS));
        if (ISLANDRESMAP[island] === "sleaze") buffList = buffList.concat(effectFilter(SLEAZEBUFFS));
        if (ISLANDRESMAP[island] === "hot") buffList = buffList.concat(effectFilter(HOTBUFFS));
        if (ISLANDRESMAP[island] === "cold") buffList = buffList.concat(effectFilter(COLDBUFFS));
        if (ISLANDRESMAP[island] === "spooky") buffList = buffList.concat(effectFilter(SPOOKYBUFFS));
    }

    // Return the list for execution.
    return buffList;
}

/**
 * Function that checks if something is equipped and if so does 
 *   nothing. Else, it equips it.
 */
function checkThenEquip(slot,item) {
    if (equippedItem(toSlot(slot)) === item) return;
    if (itemAmount(item) < 1) abort("You do not have a "+item.name+"... comment it out?");
    equip(toSlot(slot),item);
}

/**
 * Function used to ensure you are outfitted appropriately.
 */
function manageEquipment(island) {
    // Start with the base outfit you are using most of the day.
    checkThenEquip("hat",toItem("Crown of Thrones"));
    checkThenEquip("back",toItem("unwrapped knock-off retro superhero cape"));
    checkThenEquip("shirt",toItem("Jurassic Parka"));
    checkThenEquip("weapon",toItem("fish hatchet"));
    checkThenEquip("off-hand",toItem("deft pirate hook"));
    checkThenEquip("pants",toItem("waders"));
    checkThenEquip("acc1",toItem("mafia thumb ring"));
    checkThenEquip("acc2",toItem("mime army infiltration glove"));
    checkThenEquip("acc3",toItem("duonoculars"));
    
    //if (numericModifier(toElement(ISLANDRESMAP[island])+" resistance") < 40) {
        //checkThenEquip("acc3",toItem("Pocket Square of Loathing"));
    }

    // Equip your Disgeist, if it isn't equipped
    if (myFamiliar() != toFamiliar("Disgeist")) {
        useFamiliar(toFamiliar("Disgeist"));
    }

    // Equip Jokester's gun if you have it and haven't fired.
    if (getProperty("_firedJokestersGun") === "false") 
        checkThenEquip("weapon",toItem("The Jokester's Gun"));

    // Equip docbag if you have it and haven't fired.
    //if (toInt(getProperty("_chestXRayUsed")) < 3 ) 
        //checkThenEquip("acc3",toItem("Lil' Doctor™ bag"));

    // Ensure parka's set to the right mode if YR is up; otherwise, -com
    if (haveEffect(toEffect("Everything Looks Yellow")) === 0) { 
        if (getProperty("parkaMode") != "dilophosaur") cliExecute("parka dilophosaur");
    } else if (getProperty("_spikolodonSpikeUses") < 5) {
        if (getProperty("parkaMode") != "spikolodon") cliExecute("parka spikolodon");
    } else {
        if (getProperty("parkaMode") != "pterodactyl") cliExecute("parka pterodactyl");
    }

    // Ensure darts are equipped for bullseyes if they're up.
    // if (haveEffect(toEffect("Everything Looks Red")) < 1)
        // checkThenEquip("acc3",toItem("Everfull Dart Holster"));

    // Ensure shoes are equipped for freeruns if they're up.
    // if (haveEffect(toEffect("Everything Looks Green")) < 1)
        // checkThenEquip("acc3",toItem("Spring Shoes"));

/**
 * Eat/drink the "right" dread food/drink to get the massive +res boosts.
 * @param {string} island    the island you will be adventuring at
 */
function chompSomeDread(islandToRun, turnsToRun) {
    // There are two dread consumables for each element, giving you a total 
    //   of +10 res if you achieve both.

    // Here are the element mappings:
    //                     COL HOT STE SLE SPO
    //   Dreadful Chill =>          X   X      => Cold Pocket,  Cold-Fashioned
    //   Dreadful Heat  =>  X               X  => Hot Pocket, Hot Toddy
    //   Dreadful Fear  =>  X           X      => Spooky Pocket, Grimlet
    //   Dreadful Sheen =>      X   X          => Sleaze Pocket, Slithery Nipple
    //   Dreadful Smell =>      X           X  => Stink Pocket, Dank and Stormy

    if (islandToRun=="easter")    var dreadEffects = ["Dreadful Chill", "Dreadful Sheen"];
    if (islandToRun=="patrick")   var dreadEffects = ["Dreadful Chill", "Dreadful Fear"];
    if (islandToRun=="vets")      var dreadEffects = ["Dreadful Sheen", "Dreadful Smell"];
    if (islandToRun=="thanks")    var dreadEffects = ["Dreadful Heat", "Dreadful Fear"];
    if (islandToRun=="xmas")      var dreadEffects = ["Dreadful Heat", "Dreadful Smell"];

    // Iterate through the island's two feelings, capping the first then the second.
    dreadEffects.forEach((dreadFeeling) => {
        // Even with maximal space, you're looking at 3 food & 5 drinks.
        for (let i = 0; i < 8; i++) {
            // Only eat if you have 4+ fullness left.
            if (fullnessLimit() - myFullness() >= 4) {
                
                // Only eat if you don't have sufficient turns yet.
                if(haveEffect(toEffect(dreadFeeling)) < turnsToRun) eat(toItem(DREADPOCKET[dreadFeeling]));
            }
            // Only drink if you have 4+ inebriety left.
            if (inebrietyLimit() - myInebriety() >= 4) {

                // Only drink if you don't have sufficient turns yet.
                if(haveEffect(toEffect("Ode to Booze"))<4) useSkill(1, toSkill("The Ode to Booze"));
                if(haveEffect(toEffect(dreadFeeling)) < turnsToRun) drink(toItem(DREADDRINK[dreadFeeling]));
            }
        }
    });
}

/**
 * This function is basically taken from loathers/libram. Specifically,
 *   getMacroID and the setAutoattack functions. Thanks to Neil & Bean.
 */
function setupCombat() {
    // Set default macro information.
    var macroName = "yohoho24";
    var builtCCS = RAWCOMBAT.join(";");

    // Use an xpath query to look at all macro names.
    const query = `//select[@name="macroid"]/option[text()="${macroName}"]/@value`;
    const macroWebpage = visitUrl("account_combatmacros.php");
    var macroMatches = xpath(macroWebpage, query);

    // Check if the new macro exists
    if (macroMatches.length === 0) {
        visitUrl("account_combatmacros.php?action=new");
        const newMacroText = visitUrl(`account_combatmacros.php?macroid=0&name=${macroName}&macrotext=abort&action=save`);
        macroMatches = xpath(newMacroText, query);
    }

    // The autoAttack ID is different from the macro ID; need to add 99 mil!
    var macroID = parseInt(macroMatches[0],10);
    var autoAttackID = 99000000 + macroID;

    visitUrl('account_combatmacros.php?action=new');
    visitUrl('account_combatmacros.php?macroid='+macroID+'&name='+macroName+'&macrotext='+urlEncode(builtCCS)+'&action=save',true, true,);
    visitUrl('account.php?am=1&action=autoattack&value='+autoAttackID+'&ajax=1');
}

/**
 * This function sets up your eagle in the outskirts, if necessary
 * @param {boolean} doNotAdv   if true, don't adv; if false, adv is OK
 */
function setupEagle(doNotAdv) {
    if (doNotAdv) return;
    if (haveEffect(toEffect(2822)) != 0) return;
    if (!canAdventure(toLocation("Outskirts of Cobb's Knob"))) return;
    
    // Swap over to your eagle, setup your combat
    useFamiliar(toFamiliar("Patriotic Eagle"));
    setupCombat();

    // Use your eagle in the outskirts for your pledge
    if (myAdventures() > 0) adv1(toLocation("Outskirts of Cobb's Knob"),1);

}

/**
 * Function that runs a specified number of turns at a specified island.
 * @param {number} turns      number of turns to burn
 * @param {island} islandToRun    island; one of "vets, patrick, easter"
 */

function runTurns(turns, islandToRun) {
    const islandSnarf = ISLANDSNARFBLATS[islandToRun];
    const islandName = toLocation(islandSnarf).toString();
    setupCombat();
    var turnsToPlay = turns;

    if (turns > myAdventures()) turnsToPlay = myAdventures();
    
    const targetTurns = myTurncount() + turnsToPlay;

    for (let i=1; i < turnsToPlay + 1; i++) {
        // Break out if you've used the turns 
        if (myTurncount() >= targetTurns) break;

        var preAdvTurns = myTurncount();
        
        manageEquipment(islandToRun);
        if (myAdventures() > 0) adv1(toLocation(islandSnarf),1);

        if (myAdventures() > 0 && preAdvTurns === myTurncount()) i--; 
        
        // Sending the fallbot to your current zone. This is probably not "totally" right,
        //   but it increases your take of random items from the zone, which seems fine.
        if (itemAmount(toItem("autumn-aton")) > 0)  cliExecute("autumnaton send "+islandName);
    }
}

function main(cmd) {

    var turnsToRun = 0;
    var islandToRun = "easter";
    var doNotAdventure = false;

    if (typeof cmd === 'undefined') {
        cmd="help";
    }

    if (cmd.includes("help")) {
        print("---------------------------------------------");
        print("====== > YO HO HO 2024 !!!!");
        print("---------------------------------------------");
        print("");
        print("This is an extremely simplistic crimbo script. Here are currently supported commands:");
        print("");
        print(" - help ... this output");
        print(" - CONSUME ... trust this script to eat/drink for you, via soolar's CONSUME & some dread stuff.");
        print(" - setup=100 ... sets you up for 100 turns, but doesn't run them or eat. change 100 to any int.");
        print(" - turns=100 ... runs 100 turns. change 100 to any int");
        print(" - island=patrick ... sets your island. Options are [patrick, easter, vets]");
        print("");
        print("Please contribute to this script on GitHub if you want it to have more features. It sucks right now!");

    } else {
        
        if (cmd.includes("turns")) {
            cmd.split(" ").forEach((cmdlet) => {
                if (cmdlet.includes("=")) {
                    if (cmdlet.split("=")[0] === "turns") {
                        turnsToRun = toInt(cmdlet.split("=")[1]);
                    }
                }   
            });
        }
        if (cmd.includes("setup")) {
            doNotAdventure = true;
            cmd.split(" ").forEach((cmdlet) => {
                if (cmdlet.includes("=")) {
                    if (cmdlet.split("=")[0] === "setup") {
                        turnsToRun = toInt(cmdlet.split("=")[1]);
                    }
                }   
            });
        }
    
        if (cmd.includes("island")) {
            cmd.split(" ").forEach((cmdlet) => {
                if (cmdlet.includes("=")) {
                    if (cmdlet.split("=")[0] === "island") {
                        islandToRun = cmdlet.split("=")[1];
                    }
                }   
            });
        }
        
        ahoyMaties();
        manageEquipment(islandToRun);
        setupEagle(doNotAdventure);

        // Only chomp if they are adventuring; only CONSUME if they need to.
        if (cmd.includes("CONSUME") && !doNotAdventure) {
            chompSomeDread(islandToRun, turnsToRun);

            // Value per turn is sort of annoying! Best approximation seems to be 
            //   about 15% of NCs and 2 spirits per fight for the other 85%, so...
            //     0.85 * 2 + 0.15 * 11 = 3.35
            const valueForCONSUME = 3.35 * VALUEOFSPIRIT; 
            if (myAdventures() < turnsToRun) cliExecute("CONSUME ALL NOMEAT VALUE "+valueForCONSUME);
        }
    
        var buffsToSnag = priceCheck(islandToRun);
    
        executeBuffs(turnsToRun, buffsToSnag);

        var userNC = numericModifier("Combat Rate");
        var userRES = numericModifier(toElement(ISLANDRESMAP[islandToRun])+" resistance");
        print("After setup, you are at "+userNC+" combat rate and "+userRES+" targeted resistance.");
        if (userNC > -35) {
            var expectedNCsMissed = ((35+userNC)/100.0)*turnsToRun;
            var expectedLoss = expectedNCsMissed*(VALUEOFSPIRIT*(11-2));
            print( "... you are leaving "+expectedLoss.toFixed(0)+" meat on the table via insufficient NC.");
        }
        if (userRES < 40) {
            var expectedLoss = ((userNC/100)*turnsToRun)*(.275)*(40-userRES)*(VALUEOFSPIRIT);
            print( "... you are leaving "+Math.abs(expectedLoss.toFixed(0))+" meat on the table via insufficient RESISTANCE.");
        }

        if(doNotAdventure === false) runTurns(turnsToRun, islandToRun);

    }


}

module.exports.main = main;
