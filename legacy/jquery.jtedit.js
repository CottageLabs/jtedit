/*
 * jquery.jtedit.js
 *
 * a tool for displaying JSON objects as a table
 * and allowing edit of them
 *
 * open source license - cc-by
 * 
 * created by Mark MacGillivray - mark@cottagelabs.com
 *
*/


(function($){
    $.fn.jtedit = function(options) {

        // specify the defaults
        var defaults = {
            "edit":true,                    // whether or not to make the table editable
            "source":undefined,             // a source from which to GET the JSON data object
            "target":undefined,             // a target to which updated JSON should be POSTed
            "noedit":[],                    // a list of keys that should not be editable, when edit is enabled
            "hide":[],                      // a list of keys that should be hidden from view
            "data":undefined,               // a JSON object to render for editing
            "tags": [
                "type",
                "assembly",
                "name",
                "drawing",
                "assembled_by",
                "assembled_date",
                "inspected_by",
                "inspected_date",
                "assembly_history",
                "location",
                "location_history",
                "test"
            ]
        };

        // add in any overrides from the call
        var options = $.extend(defaults,options);

        // add in any options from the query URL
        var geturlparams = function() {
            var vars = [], hash;
            var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
            for (var i = 0; i < hashes.length; i++) {
                    hash = hashes[i].split('=');
                    vars.push(hash[0]);
                    if (!(hash[1] == undefined)) {
                        hash[1] = unescape(hash[1]);
                        if (hash[0] == "source") {
                            hash[1] = hash[1].replace(/"/g,'');
                        } else if (hash[0] == "data") {
                            hash[1] = $.parseJSON(hash[1]);
                        }
                    }
                    vars[hash[0]] = hash[1];
            }
            return vars;
        }
        $.extend(options,geturlparams());


        // ===============================================
        // create a pretty table out of JSON
        var tablify = function(data) {
            var s = "";
            for (var key in data) {
                if (data.constructor.toString().indexOf("Array") == -1) {
                    s += '<div class="jtedit_kv clearfix">';
                } else {
                    s += '<div class="jtedit_list">';
                }
                if (typeof(data[key]) == 'object') {
                    if (data[key].constructor.toString().indexOf("Array") == -1) {
                        s += '<div class="jtedit_objectcontainer clearfix">'
                        s += '<div class="jtedit_objectheader">'
                        if (data.constructor.toString().indexOf("Array") == -1) {
                            s += '<input type="text" class="jtedit_objectkey" value="' + key + '" />'
                        }
                        s += '</div>'
                        s += '<div class="jtedit_objectitem">'
                        s += tablify(data[key]);
                        s += '</div>'
                        s += '</div>'
                    } else {
                        s += '<div class="jtedit_listcontainer clearfix">'
                        s += '<div class="jtedit_listinfo clearfix">'
                        if (data.constructor.toString().indexOf("Array") == -1) {
                            s += '<textarea class="jtedit_listkey">' + key + '</textarea>'
                        }
                        s += '</div>'
                        s += '<div class="jtedit_listitems">'
                        s += tablify(data[key]);
                        s += '<a class="btn" href="">add another</a>'
                        s += '</div>'
                        s += '</div>'
                    }
                } else {
                    if (data.constructor.toString().indexOf("Array") == -1) {
                        s += '<input type="text" class="jtedit_key" value="' + key + '" />';
                        if (data[key].length > 30) {
                            s += '<textarea class="jtedit_value">' + data[key] + '</textarea>';
                        } else {
                            s += '<input type="text" class="jtedit_value" value="' + data[key] + '" />';
                        }
                    } else {
                        if (data[key].length > 30) {
                            s += '<textarea class="jtedit_listvalue">' + data[key] + '</textarea>';
                        } else {
                            s += '<input type="text" class="jtedit_listvalue" value="' + data[key] + '" />';
                        }
                    }
                }
                s += '</div>';
            }
            return s;
        }


        // ===============================================
        // parse a pretty table into JSON
        var parsetable = function(table) {
            if (table == undefined) {
                var table = $('table');
            }
            if (table.children('tbody').first().children('tr').first().children('td').children('.jtedit_key').length) {
                var json = {};
            } else {
                var json = [];
            }
            table.children('tbody').first().children('tr').each(function() {
                var val = "";
                if ($(this).children('td').children('table').length) {
                    val = parsetable($(this).children('td').children('table'));
                } else {
                    val = $(this).children('td').children('.jtedit_field').val();
                }
                if ($(this).children('td').children('.jtedit_key').length) {
                    if ($(this).children('td').children('.jtedit_key').val().length != 0) {
                        json[$(this).children('td').children('.jtedit_key').val()] = val;
                    }
                } else {
                    if (val != undefined) {
                        if (val.length > 0 || typeof(val) == 'object') {
                            json.push(val);
                        }
                    }
                }
            });
            return json;
        }
        
        // make everything in the JSON texbox selected by default
        var selectall = function(event) {
            $(this).select();
        }
        // prevent unselect on chrome mouseup
        var selectallg = function(event) {
            event.preventDefault();
            $(this).select();
        }

        var updates = function(event) {
            $('#jtedit_json').val(JSON.stringify(parsetable(),"","    "));
            $(this).removeClass('text_empty');
            if ($(this).val() == "") {
                $(this).addClass('text_empty');
            }
        }

        // save the record
        var jtedit_saveit = function(event,datain) {
            event.preventDefault();
            if (datain) {
                var thedata = datain
            } else {
                var thedata = $.parseJSON(jQuery('#jtedit_json').val());
            }
            if (!options.source) {
                options.source = prompt('Please provide URL to save this record to:')
            }
            $.ajax({
                url: options.source
                , type: 'POST'
                , data: JSON.stringify(thedata)
                , contentType: "application/json; charset=utf-8" 
                , dataType: 'json'
                , processData: false
                , success: function(data, statusText, xhr) {
                    alert("Changes saved");
                    window.location = '/record/' + data.record[0];
                }
                , error: function(xhr, message, error) {
                    alert("Error... " + error);
                }
            });
        }

        // delete the record
        var jtedit_deleteit = function(event) {
            event.preventDefault();
            if (!options.source) {
                alert('There is no available source URL to delete from')
            } else {
                var confirmed = confirm("You are about to irrevocably delete this. Are you sure you want to do so?")
                if (confirmed) {
                    $.ajax({
                        url: options.source
                        , type: 'DELETE'
                        , success: function(data, statusText, xhr) {
                            alert("Record deleted.");
                            window.location = '/';
                        }
                        , error: function(xhr, message, error) {
                            alert("Error... " + error);
                        }
                    });
                }
            }
        }
        
        // switch visual type
        var jtedit_visual = function(event) {
            event.preventDefault();
            if ($(this).attr('href') == 'json') {
                $('#jtedit_visual').hide()
                $('#jtedit_json').show()
            } else {
                $('#jtedit_json').hide()
                $('#jtedit_visual').show()
            }
        }
        
        
        // ===============================================
        // get data from a source URL
        var data_from_source = function(sourceurl) {
            $.ajax({
                url: sourceurl
                , type: 'GET'
                , success: function(data, statusText, xhr) {
                    options.data = data;
                    $('#jtedit_visual').append(tablify(options.data,options.edit));
                    jtedit_bindings();
                    $('#jtedit_json').val(JSON.stringify(parsetable(),"","    "));
                }
                , error: function(xhr, message, error) {
                    options.source = false;
                    alert("Sorry. Your data could not be parsed from " + sourceurl + ". Please try again, or paste your data into the provided field.");
                    data_from_user()
                    console.error("Error while loading data from remote source", message);
                    throw(error);
                }
            });
        }

        // get data from the user
        var data_from_user = function() {
            $('.jtedit_actions').hide()
            var fromuser = '<div id="get_fromuser"><p>Please provide some JSON data:</p>' + 
                '<p><textarea style="width:300px;height:300px;" name="data" id="data_fromuser">' + 
                '{"abstract": "Folien zu einem Vortrag auf der ODOK 2010 in Leoben zu Linked Data und Open Data, mit einer knappen Darstellung der Linked-Open-Data-Aktivit\u110e\u1162ten im hbz-Verbund.", "added-at": "2011-02-17T13:00:20.000+0100", "author": ["pretend",{"id": "PohlAdrian","name": "Pohl, Adrian"},{"id": "PohlAdrian","name": "Pohl, Adrian"}], "journal":{"id":"somejournal","name":"somename"}, "biburl": "http://www.bibsonomy.org/bibtex/229ff5da471fd9d2706f2fd08c17b43dc/acka47", "cid": "Pohl_2010_LOD", "collection": "pohl", "copyright": "http://creativecommons.org/licenses/by/2.5/", "howpublished": "published via slideshare.net", "id": "531e7aa806574787897314010f29d4cf", "interhash": "558af6397a6aad826d47925a12eda76c", "intrahash": "29ff5da471fd9d2706f2fd08c17b43dc", "keyword": ["ODOK hbz libraries linkeddata myown opendata presentation"], "link": [{"url": "http://www.slideshare.net/acka47/pohl-20100923-odoklod"}], "month": "September", "owner": "test", "timestamp": "2011-02-17T13:00:20.000+0100", "title": "Freie Katalogdaten und Linked Data", "type": "misc", "url": "http://localhost:5000/test/pohl/Pohl_2010_LOD", "year": "2010" }' +
                '</textarea></p>' +
                '<p><input type="submit" name="submit" value="submit" id="submit_fromuser" class="btn primary" /></p></div>';
            $('#jtedit').append(fromuser)
            var fromuser = function(event) {
                event.preventDefault()
                options.data = $.parseJSON($('#data_fromuser').val());
                $('#get_fromuser').remove()
                $('#jtedit_visual').append(tablify(options.data,options.edit));
                jtedit_bindings();
                $('#jtedit_json').val(JSON.stringify(parsetable(),"","    "));
                $('.jtedit_actions').show()
            }
            $('#submit_fromuser').bind('click',fromuser)
        }


        // ===============================================
        // setup up the jtedit screen
        var jtedit_setup = function(obj) {
            // append the jtedit div, put the editor, the menus and the raw JSON in it
            $('#jtedit',obj).remove();
            $(obj).append('<div id="jtedit" class="clearfix"></div>');
            var actions = '<div class="jtedit_actions"><div class="btn-group">' +
                '<a class="btn dropdown-toggle" data-toggle="dropdown" href="#">Mode ' +
                '<span class="caret"></span></a>' +
                '<ul class="dropdown-menu">' +
                '<li><a class="jtedit_visual" href="visual">visual</a></li><li><a class="jtedit_visual" href="json">JSON</a></li>' +
                '</ul></div>' +
                '<a class="jtedit_options btn" href="">options</a> ' + 
                '<a class="jtedit_saveit btn btn-primary" href="">save</a> ' + 
                '<a class="jtedit_deleteit btn btn-danger" href="">delete</a></div>';
            $('#jtedit').append(actions + '<div id="jtedit_visual"></div><textarea id="jtedit_json">' + 
                JSON.stringify(parsetable(),"","    ") + '</textarea>' + actions);
            $('#jtedit_json').hide();
        }
        
        // apply binding to jtedit parts
        var jtedit_bindings = function() {
            $('#jtedit input').autoResize({"minWidth": 150,"maxWidth": 300,"minHeight": 20,"maxHeight": 200,"extraSpace": 10});
            $('.jtedit').bind('blur',updates);
            $('#jtedit input, textarea').bind('mouseup',selectallg);
            $('.jtedit_saveit').bind('click',jtedit_saveit);
            $('.jtedit_deleteit').bind('click',jtedit_deleteit);
            $('.jtedit_key, .jtedit_objectkey, .jtedit_listkey').autocomplete({source:options.tags});
            $('.jtedit_visual').bind('click',jtedit_visual);
            /*$('.jtedit_field').each(function() {
                if ( $(this).prev('input').hasClass('jtedit_key') ) {
                    if ( $(this).prev('input').val().search("_date") != -1 ) {
                        $(this).datetimepicker({ dateFormat: 'yy-mm-dd' })
                    }
                }
            })*/

        }


        // ===============================================
        // create the plugin on the page
        return this.each(function() {

            obj = $(this);
            jtedit_setup(obj);
            
            if (!options.data) {
                if (options.source) {
                    data_from_source(options.source);
                } else {
                    data_from_user();
                }
            } else {
                $('#jtedit_visual').append(tablify(options.data,options.edit));
                jtedit_bindings();
                $('#jtedit_json').val(JSON.stringify(parsetable(),"","    "));
            }

        });

    }
})(jQuery);




