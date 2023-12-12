module.exports = class Time {

    constructor() {

        // permet de renseigner la clé primaire de la table STATS
        this.dateOfDay = new Date();
        this.anneeCourant = this.dateOfDay.getFullYear();
        this.jourCourant = `${this.dateOfDay.getDate()}/${this.dateOfDay.getMonth() + 1}`;

        // temps normal de fonctionnement en minutes
        this.tmpsNormal = (19 * 60) + 30;

        // calcul de l'écart
        this.heureDernierArret;
        this.minuteDernierArret;

        // detecte les arrets prolongés
        this.aRepris = true;

        // permet l'écriture du fichier log en local
        this.fs = require('fs');

        // par defaut a 0 sauf si des données sont présentes en base
        this.tmpsTotalArret = 0;
        this.nbArret = 0;
        this.prolongation = 0;

    }


    Arret(datetime) {

        if (this.aRepris == true) {

            // écriture du log dans le fichier
            let d = new Date();
            this.fs.appendFile("./log.txt", "[" + d.getHours() + ":" + d.getMinutes() + "] [WARN] -- arrêt de la ligne 1 --\n", function (err) { if (err) console.log("erreur"); });

            // decoupage heure et minute
            let h = parseInt(this.DateTimeHeure(datetime) + 1);
            let m = parseInt(this.DateTimeMinute(datetime));

            this.heureDernierArret = h;
            this.minuteDernierArret = m;

            this.nbArret++;
        }
        else {
            // signifie une prologation de l'arret

            // écriture du log dans le fichier
            let d = new Date();
            this.fs.appendFile("./log.txt", "[" + d.getHours() + ":" + d.getMinutes() + "] [WARN] -- La ligne est de nouveau arrêtée mais n a pas repris -- Prolongation du dernier arrêt\n", function (err) { if (err) console.log("erreur"); });

            this.prolongation++;
        }

        this.aRepris = false;

    }

    // extrait l'heure de la réponse fournise par l'api
    DateTimeHeure(datetime) {
        return parseInt(datetime.substring(0, 2));
    }

    // extrait les minutes de la réponse fournise par l'api
    DateTimeMinute(datetime) {
        return parseInt(datetime.substring(3, 5));
    }

    Reprise(datetime) {

        // écriture du log dans le fichier
        let d = new Date();
        this.fs.appendFile("./log.txt", "[" + d.getHours() + ":" + d.getMinutes() + "] [WARN] -- reprise de la ligne 1 --\n", function (err) { if (err) console.log("erreur"); });

        this.aRepris = true;
        // decoupage heure et minute
        let h = parseInt(this.DateTimeHeure(datetime) + 1);
        let m = parseInt(this.DateTimeMinute(datetime));


        // calcul temps d'arret
        let arretH = (((h * 60) - (this.heureDernierArret * 60)) / 60);
        let arretM = m - this.minuteDernierArret;

        if (arretM > 60) {
            arretM -= 60;
            arretH += 1;
        }

        this.tmpsTotalArret += (arretH * 60) + arretM;

    }


    // recupère le nombre d'arret en base sinon 0
    getNbArret() {

        var result;
        let sqlite3 = require('sqlite3').verbose();
        let db = new sqlite3.Database('./bdd', function (err) { });

        db.all('Select nbArret as a from stats where annee="' + this.anneeCourant + '" and jour="' + this.jourCourant + '"', [], (err, rows) => {

            if (err) {
                console.log("erreur");
                this.nbArret = 0;
            }

            if (rows) {
                try {
                    this.nbArret = rows[0].a;
                } catch (exception) {
                    console.log("Aucun champ en bdd");
                    this.nbArret = 0;
                }

            }
        })

    }


    // récupère le temps total d'arret en base sinon 0
    getTmpArret() {
        let sqlite3 = require('sqlite3').verbose();
        let db = new sqlite3.Database('./bdd', function (err) { });

        db.all('Select tmpInterruption as a from stats where annee="' + this.anneeCourant + '" and jour="' + this.jourCourant + '"', [], (err, rows) => {
            if (err) {
                console.log(err);
                this.tmpsTotalArret = 0;
            }

            if (rows) {
                try {
                    this.tmpsTotalArret = rows[0].a;
                } catch (exception) {
                    console.log("Aucun champ en bdd");
                    this.tmpsTotalArret = 0;
                }

            }


        })


    }


    // recupere le nombre d'arret prolongé en base sinon 0
    getProlongation() {
        let sqlite3 = require('sqlite3').verbose();
        let db = new sqlite3.Database('./bdd', function (err) { });

        db.all('Select nbProlonge as a from stats where annee="' + this.anneeCourant + '" and jour="' + this.jourCourant + '"', [], (err, rows) => {
            if (err) {
                console.log(err);
                this.prolongation = 0;
            }

            if (rows) {
                try {
                    this.prolongation = rows[0].a;
                } catch (exception) {
                    console.log("Aucun champ en bdd");
                    this.prolongation = 0;
                }

            }


        })


    }


    // convertis les minutes en heure minutes
    AfficherHeure(heure) {
        heure = Math.round(heure);

        let toHeure = parseInt(heure / 60);

        let parseMin = parseFloat(heure / 60).toFixed(2);
        let minutes = parseInt(((parseMin) + "").split(".")[1]);

        minutes = minutes * 60;
        if ((minutes + "").charAt(2) == "0") {
            minutes = (minutes + "").substring(0, 1);
        }
        else {
            minutes = (minutes + "").substring(0, 2);
        }

        return "" + toHeure + " h " + minutes;

    }

    // calcul et retourne un % du service assuré
    AfficherPourcentage() {
        return " Soit " + parseFloat((100 * (this.tmpsNormal - this.tmpsTotalArret) / 60) / (this.tmpsNormal / 60)).toFixed(2) + "% du service assuré.";
    }


    // Sauvegarde ou update les données en base dans la table stats via la clé primaire (annee,jour)
    Save() {

        // connexion à la base
        let sqlite3 = require('sqlite3').verbose();
        let db = new sqlite3.Database('./bdd', function (err) { });


        db.all('SELECT COUNT(*) AS count FROM STATS WHERE annee="' + this.anneeCourant + '" AND jour="' + this.jourCourant + '"', [], (err, rows) => {
            if (err) {
                console.log(err);
            }

            // signifie que la table contien aucun enregistrement pour ce jour, il faut l'initialiser
            if (rows[0].count == 0) {
                // donc on l'initialise 
                console.log("a besoin d'être init en base");
                db.run('INSERT INTO STATS (annee,jour) VALUES ("' + this.anneeCourant + '","' + this.jourCourant + '")', function (err) { });

            }

            // sinon, ou si l'initalisation à réussit on sort et on update les valeurs

        });

        db.run('UPDATE STATS set tmpInterruption = ' + this.tmpsTotalArret + ', nbArret =' + this.nbArret + ', nbProlonge=' + this.prolongation + ' WHERE annee="' + this.anneeCourant + '" and jour="' + this.jourCourant + '"', function (err) { });




    }

    // La fonction prépare le tweet à partir des variables actualisés par la base
    Tweet() {

        let tmpArret = "Temps total d'intérruption: " + this.tmpsTotalArret + " minute(s) ";
        let stop = " Pour " + this.nbArret + " intérruption(s)";
        let nbProlonge = "Nombre d'intéruption(s) prologée(s): " + this.prolongation + "";
        let pourcentage = this.AfficherPourcentage();

        if (this.nbArret == 0) {
            // aucun incident dans la journée
            return "Aucune intérruption de trafic pour ce jour.\n100% du service a été assuré !";
        } else {
            // il y a eu des incidents ... on les affiches
            return "Récapitulatif de la journée:\n " + tmpArret + "\n" + stop + "\n " + nbProlonge + "\n" + pourcentage + "\n\n#iléviaMétro #Ligne1";
        }

    }



    // remet a 0 les variables locales 
    Raz() {
        this.tmpsTotalArret = 0;
        this.nbArret = 0;
        this.heureDernierArret = null;
        this.minuteDernierArret = null;
        this.aRepris = true;
        this.prolongation = 0;

        //DEPRECATED
        // l'appel à Save() écrasera les dernières données du fichier save.json par la RAZ.
        this.Save();

        // écriture du log dans le fichier
        let d = new Date();
        this.fs.appendFile("./log.txt", "[" + d.getHours() + ":" + d.getMinutes() + "] [WARN] -- Remise à 0 complète, fin de service! --\n", function (err) { if (err) console.log("erreur"); });


    }
}
