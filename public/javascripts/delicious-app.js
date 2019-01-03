import "../sass/style.scss";
import autocomplete from "./modules/autocomplete";
import { $, $$ } from "./modules/bling";
import ajaxHeart from "./modules/heart";
import makeMap from "./modules/map";
import typeAhead from "./modules/typeAhead";

autocomplete($("#address"), $("#lat"), $("#lng"));

typeAhead($(".search"));

makeMap($("#map"));

const heartForms = $$("form.heart");
heartForms.on("submit", ajaxHeart);
