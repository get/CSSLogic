/*!
 * CSSLogic - jQuery plugin that lets you use variables in your CSS files
 *
 * https://github.com/get/CSSLogic
 *
 * Copyright 2011, Gal Koren
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 */

function parseQuery ( query ) {
   var Params = new Object ();
   if ( ! query ) return Params;
   var Pairs = query.split(/[;&]/);
   for ( var i = 0; i < Pairs.length; i++ ) {
      var KeyVal = Pairs[i].split('=');
      if ( ! KeyVal || KeyVal.length != 2 ) continue;
      var key = unescape( KeyVal[0] );
      var val = unescape( KeyVal[1] );
      val = val.replace(/\+/g, ' ');
      Params[key] = val;
   }
   return Params;
}

// Get JS file CSS extension
var myScript = document.getElementById('csslogicscript');
var queryString = myScript.src.replace(/^[^\?]+\??/,'');
var params = parseQuery( queryString );
var css_file = params.css;

var variables = [];
var is_a_comment = false;
var skip_one = false;
var phrase = "";
var variable_name = "";
var record_variable_until_semicolon = false;

var element_name = "";
var css_attribute = "";
var record_css_value_until_semicolon = false;
var record_until_closing_curly_brace = false;

function is_comment(data, i) {
	i = parseInt(i);
	return (data[i] == "/" && data[i+1] == "*");
}

function is_end_of_comment(data, i) {
	i = parseInt(i);
	return (data[i] == "*" && data[i+1] == "/");
}

function is_space(data, i) {
	return (data[i] == "" || data[i] == " ");
}

function is_assignment(data, i) {
	return (data[i] == "=");
}

function is_css_definition(data, i) {
	return (data[i] == "{");
}

function is_css_colon(data, i) {
	return (data[i] == ":");
}

function trim_spaces(string) {
	return $.trim(string);
}

function replace_variables_with_values(string) {
	var location_of_opening_bracket = string.indexOf("[");
	var location_of_closing_bracket = string.indexOf("]");
	if(location_of_opening_bracket >= 0 && location_of_closing_bracket >= 0) {
		
		// extract variable from string with the brackets
		variable_name_in_string =  "";
		for(i = location_of_opening_bracket; i <= location_of_closing_bracket; i++ ) {
			variable_name_in_string += string[i];
		}
		
		replaced = false;
		// find variable in list of variables and replace 
		// the variable inside the string with the corresponding value.
		for(i in variables) {
			if("[" + i + "]" == variable_name_in_string) {
				string = string.replace(variable_name_in_string, variables[i]);
				replaced = true;
			}
		}
		
		// if no replacement occurred, exit recursion
		// and throw error
		if(!replaced) {
			console.error("Undefined variable: " + variable_name_in_string.replace("[", "").replace("]", ""));
			return string;
		}
		
		return replace_variables_with_values(string);
	} else {
		return string;
	}
}

$.get(css_file, {}, function(data) {
	
	var i;
	
	for(i in data) {
		if(skip_one) {
			skip_one = false;
			continue;
		}
		
		if(is_a_comment) {
			if(is_end_of_comment(data, i)) {
				is_a_comment = false;
			}
			// now skip the closing comment slash */
			skip_one = true;
			continue;
		}
		
		if(is_comment(data, i)) {
			is_a_comment = true;
			// now skip the opening comment asterisk /*
			skip_one = true;
			continue;
		}
		
		if(record_variable_until_semicolon) {
			if(data[i] == ";") {
				// avoid any spaces in variable name or value
				variable_name = trim_spaces(variable_name);
				phrase = trim_spaces(phrase);
				
				// define a variable
				variables[variable_name] = phrase;
				
				// nullify all assistants
				phrase = "";
				variable_name = "";
				record_variable_until_semicolon = false;
			} else {
				phrase += data[i];
			}
			continue;
		}
		
		if(record_until_closing_curly_brace) {
			if(record_css_value_until_semicolon) {
				if(data[i] == ";") {
					// avoid any spaces in attribute name or value
					css_attribute = trim_spaces(css_attribute);
					phrase = trim_spaces(phrase);
					
					phrase = replace_variables_with_values(phrase);
					
					// define a CSS rule
					if(element_name.length > 0 && css_attribute.length > 0 && phrase.length > 0) {
						$(element_name).css(css_attribute, phrase);
					}
					
					// nullify all assistants
					phrase = "";
					css_attribute = "";
					record_css_value_until_semicolon = false;
				} else {
					phrase += data[i];
				}
				continue;
			}
			
			if(data[i] == "}") {
				record_until_closing_curly_brace = false;
			} else {
				if(is_css_colon(data, i)) {
					css_attribute = phrase;
					phrase = "";					
					record_css_value_until_semicolon = true;
				} else {
					phrase += data[i];
				}
			}
			continue;
		}
		
		if(is_assignment(data, i) && (phrase.length > 0)) {
			variable_name = phrase;
			phrase = "";
			record_variable_until_semicolon = true;
			continue;
		} 
		
		if(is_css_definition(data, i) && (phrase.length > 0)) {
			element_name = phrase;
			phrase = "";
			record_until_closing_curly_brace = true;
			continue;
		}
		
		phrase += data[i];
	}
});
