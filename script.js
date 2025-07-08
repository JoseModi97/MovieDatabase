$(document).ready(function() {
    const omdbApiKey = '67b85ad0'; // Replace with your OMDb API key
    const omdbBaseUrl = 'http://www.omdbapi.com/';
    const vidsrcBaseUrl = 'https://vidsrc.xyz/';

    let currentMoviesPage = 1;
    let currentTvShowsPage = 1;
    let currentEpisodesPage = 1;
    let currentOmdbData = null; // To store OMDb data for later playback

    // Initial UI setup
    hideAllSections();
    $('#searchType').trigger('change'); // Trigger change to set initial input visibility

    // --- Event Handlers ---

    $('#searchType').on('change', function() {
        const type = $(this).val();
        $('#seasonInput, #episodeInput, #autonextSwitchContainer').addClass('d-none');
        $('#subUrlInput, #dsLangInput, #autoplayCheck').removeClass('d-none'); // Common for embed URLs

        // Clear search input and hide suggestions
        $('#searchInput').val('');
        $('#suggestionsDropdown').hide().empty();

        if (type === 'episode-embed') {
            $('#seasonInput, #episodeInput, #autonextSwitchContainer').removeClass('d-none');
            $('#searchInput').attr('placeholder', 'Enter IMDb/TMDB ID');
        } else if (type === 'movie-embed' || type === 'tv-embed') {
            $('#searchInput').attr('placeholder', 'Enter IMDb/TMDB ID');
        } else { // OMDb movie or TV
            $('#searchInput').attr('placeholder', 'Enter Title or IMDb ID');
            // Hide subtitle and language inputs for OMDb search as they are for embed URLs
            $('#subUrlInput, #dsLangInput').addClass('d-none');
        }
    });

    $('#searchButton').on('click', function() {
        const searchType = $('#searchType').val();
        const query = $('#searchInput').val().trim();
        const season = $('#seasonInput').val().trim();
        const episode = $('#episodeInput').val().trim();

        if (!query) {
            displayError("Please enter a search query.");
            return;
        }

        hideAllSections(); // Clear previous results

        if (searchType === 'movie' || searchType === 'tv') {
            fetchOmdbDetails(query, searchType);
        } else {
            // Direct embed URL construction
            let embedUrl = '';
            let videoTitle = `Playing content for ID: ${query}`;
            if (searchType === 'movie-embed') {
                embedUrl = buildEmbedUrl('movie', query);
                videoTitle = `Movie: ${query}`;
            } else if (searchType === 'tv-embed') {
                embedUrl = buildEmbedUrl('tv', query);
                videoTitle = `TV Show: ${query}`;
            } else if (searchType === 'episode-embed') {
                if (!season || !episode) {
                    displayError("Season and Episode are required for episodes.");
                    return;
                }
                embedUrl = buildEmbedUrl('episode', query, season, episode);
                videoTitle = `TV Show: ${query} - S${season}E${episode}`;
            }

            if (embedUrl) {
                embedVideo(embedUrl, videoTitle);
            } else {
                displayError("Could not construct embed URL.");
            }
        }
    });

    $('#playOmdbItemButton').on('click', function() {
        if (currentOmdbData && currentOmdbData.imdbID) {
            const type = currentOmdbData.Type === 'series' ? 'tv' : 'movie';
            let embedUrl;
            let videoTitle = currentOmdbData.Title;

            if (type === 'movie') {
                 embedUrl = buildEmbedUrl('movie', currentOmdbData.imdbID);
            } else { // TV Show - user would need to select episode, for now, just embed show
                // For simplicity, this button will embed the TV show directly.
                // A more advanced version would fetch seasons/episodes.
                // Or, we could try to guess S1E1 if OMDb doesn't provide episode details.
                // The current 'tv-embed' search type is better for specific episodes.
                // This button will act as if user searched for 'tv-embed' with the ID.
                embedUrl = buildEmbedUrl('tv', currentOmdbData.imdbID);
                 // If we have season/episode info (e.g. from an episode search in OMDb)
                if (currentOmdbData.Season && currentOmdbData.Episode) {
                     embedUrl = buildEmbedUrl('episode', currentOmdbData.imdbID, currentOmdbData.Season, currentOmdbData.Episode);
                     videoTitle += ` - S${currentOmdbData.Season}E${currentOmdbData.Episode}`;
                }
            }

            if (embedUrl) {
                hideAllSections(true); // Keep error alert if any
                embedVideo(embedUrl, videoTitle);
            } else {
                displayError("Could not construct embed URL for this item.");
            }
        }
    });


    // --- OMDb Functions ---
    function fetchOmdbDetails(query, type) {
        let searchParams = {
            apikey: omdbApiKey,
            plot: 'full' // Get full plot
        };

        if (query.toLowerCase().startsWith('tt') && /^\d+$/.test(query.substring(2))) {
            searchParams.i = query; // Search by IMDb ID
        } else {
            searchParams.t = query; // Search by Title
        }
        if (type === 'tv') {
            searchParams.type = 'series';
        } else {
            searchParams.type = 'movie';
        }
        // If title search, OMDb might return movie or series.
        // If ID search, it's specific.

        $.ajax({
            url: omdbBaseUrl,
            method: 'GET',
            dataType: 'json',
            data: searchParams,
            success: function(data) {
                if (data.Response === "True") {
                    currentOmdbData = data; // Store for potential playback
                    displayOmdbDetails(data);
                } else {
                    displayError(data.Error || "Media not found in OMDb.");
                    currentOmdbData = null;
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.error("OMDb AJAX Error:", textStatus, errorThrown);
                displayError("Failed to fetch OMDb data.");
                currentOmdbData = null;
            }
        });
    }

    function displayOmdbDetails(data) {
        $('#omdbTitle').text(data.Title || 'N/A');
        $('#omdbType').text(data.Type ? data.Type.charAt(0).toUpperCase() + data.Type.slice(1) : 'N/A');
        $('#omdbYear').text(data.Year || 'N/A');
        $('#omdbGenre').text(data.Genre || 'N/A');
        $('#omdbDirector').text(data.Director || 'N/A');
        $('#omdbWriter').text(data.Writer || 'N/A');
        $('#omdbActors').text(data.Actors || 'N/A');
        $('#omdbPlot').text(data.Plot || 'N/A');
        $('#omdbRating').text(data.imdbRating ? `${data.imdbRating}/10 (IMDb)` : 'N/A');

        if (data.Poster && data.Poster !== "N/A") {
            $('#omdbPoster').attr('src', data.Poster);
        } else {
            $('#omdbPoster').attr('src', 'https://via.placeholder.com/300x450.png?text=No+Poster');
        }

        $('#omdbDetailsCard').removeClass('d-none');
        if (data.imdbID) { // Only show play button if we have an IMDb ID
            $('#playOmdbItemButton').removeClass('d-none');
        } else {
            $('#playOmdbItemButton').addClass('d-none');
        }
    }

    // --- Embed Functions ---
    function buildEmbedUrl(type, id, season = null, episode = null) {
        let url = vidsrcBaseUrl;
        let queryParams = [];

        if (id.toLowerCase().startsWith('tt')) {
            queryParams.push(`imdb=${id}`);
        } else if (/^\d+$/.test(id)) {
            queryParams.push(`tmdb=${id}`);
        } else {
            displayError("Invalid ID format. Must be IMDb (tt...) or TMDB (numeric).");
            return null;
        }

        if (type === 'movie') {
            url += 'embed/movie';
        } else if (type === 'tv' || type === 'episode') {
            url += 'embed/tv';
            if (type === 'episode' && season && episode) {
                queryParams.push(`season=${season}`);
                queryParams.push(`episode=${episode}`);
                if ($('#autonextCheck').is(':checked')) {
                    queryParams.push('autonext=1');
                }
            }
        } else {
            return null; // Should not happen
        }

        const subUrl = $('#subUrlInput').val().trim();
        if (subUrl) {
            queryParams.push(`sub_url=${encodeURIComponent(subUrl)}`);
        }
        const dsLang = $('#dsLangInput').val().trim();
        if (dsLang) {
            queryParams.push(`ds_lang=${dsLang}`);
        }
        if ($('#autoplayCheck').is(':checked')) {
            queryParams.push('autoplay=1');
        } else {
            queryParams.push('autoplay=0');
        }


        if (queryParams.length > 0) {
            url += '?' + queryParams.join('&');
        }
        return url;
    }


    function embedVideo(url, title = "Playing Media") {
        if (url) {
            $('#vidsrcFrame').attr('src', url);
            $('#videoTitle').text(title);
            $('#videoPlayerSection').removeClass('d-none');
            // Scroll to player
            $('html, body').animate({
                scrollTop: $("#videoPlayerSection").offset().top - 20 // Adjust offset as needed
            }, 500);
        } else {
            $('#videoPlayerSection').addClass('d-none');
        }
    }

    // --- Latest Content Functions ---
    function fetchLatest(type, page, containerId, pageNumId, prevBtnId, nextBtnId) {
        const endpointMap = {
            movies: `movies/latest/page-${page}.json`,
            tvshows: `tvshows/latest/page-${page}.json`,
            episodes: `episodes/latest/page-${page}.json`
        };
        const tmdbPosterBaseUrl = 'https://image.tmdb.org/t/p/w300'; // w300 or w500 for posters
        const placeholderPoster = 'https://via.placeholder.com/300x450.png?text=No+Poster';

        if (!endpointMap[type]) {
            displayError("Invalid latest content type.");
            return;
        }
        const url = vidsrcBaseUrl + endpointMap[type];
        hideError();

        $.ajax({
            url: url,
            method: 'GET',
            dataType: 'json',
            success: function(data) {
                const gridContainer = $(`#${containerId}`);
                gridContainer.empty();
                if (data && data.result && data.result.length > 0) {
                    data.result.forEach(item => {
                        let title = item.title || item.name || 'Unknown Title';
                        let imdbId = item.imdb_id;
                        let tmdbId = item.tmdb_id; // Prefer this for poster
                        let mediaType = type === 'movies' ? 'movie' : (type === 'tvshows' ? 'tv' : 'episode');
                        let season = item.season_number;
                        let episodeNum = item.episode_number;
                        let showImdbId = item.show_imdb_id; // For episodes
                        let showTmdbId = item.show_tmdb_id; // For episodes

                        let posterUrl = placeholderPoster;
                        if (item.poster_path && item.poster_path !== "N/A") { // Assuming vidsrc might provide this
                             if (item.poster_path.startsWith('/')) { // typical for TMDB partial paths
                                posterUrl = tmdbPosterBaseUrl + item.poster_path;
                            } else {
                                posterUrl = item.poster_path; // Assuming it's a full URL
                            }
                        } else if (tmdbId && mediaType !== 'episode') { // if item is movie/tv show and has tmdbId, could fetch its poster path
                            // This would require another API call to TMDB. For now, we rely on vidsrc.
                            // If vidsrc provides a 'poster' field directly, use that.
                            // Let's assume `item.poster` might be a direct full URL if `poster_path` isn't there.
                            if(item.poster) posterUrl = item.poster;
                        } else if (showTmdbId && mediaType === 'episode') {
                             // Similar for episode's show poster
                             if(item.show_poster) posterUrl = item.show_poster; // Assuming a field like 'show_poster'
                        }


                        // For episodes, the main ID for searching might be the show's ID
                        let searchId = tmdbId || imdbId;
                        let searchTitle = title;
                        let itemSearchType = mediaType;

                        if (mediaType === 'episode') {
                            searchId = showTmdbId || showImdbId || tmdbId || imdbId; // Prefer show's ID for episode context
                            // Title for display might be episode title, but for search, show title might be better.
                            // Assuming `item.show_title` or `item.name` (for the show) might be available.
                            // For now, we'll use the episode title and its direct IDs if available.
                            // The click handler will need to be smart.
                            if (item.show_title) searchTitle = item.show_title;
                        }


                        let cardHtml = `
                            <div class="col">
                                <div class="card shadow-sm latest-item-card h-100"
                                     data-search-id="${searchId || ''}"
                                     data-tmdb-id="${tmdbId || ''}"
                                     data-imdb-id="${imdbId || ''}"
                                     data-show-tmdb-id="${showTmdbId || ''}"
                                     data-show-imdb-id="${showImdbId || ''}"
                                     data-type="${itemSearchType}"
                                     data-title="${searchTitle.replace(/"/g, '&quot;')}"
                                     ${season ? `data-season="${season}"` : ''}
                                     ${episodeNum ? `data-episode="${episodeNum}"` : ''}
                                     data-display-title="${title.replace(/"/g, '&quot;')}"
                                     >
                                    <img src="${posterUrl}" class="card-img-top" alt="${title}" style="aspect-ratio: 2/3; object-fit: cover;">
                                    <div class="card-body d-flex flex-column">
                                        <h6 class="card-title" style="font-size: 0.9rem; margin-bottom: 0.25rem;">${title}</h6>
                                        ${mediaType === 'episode' && season && episodeNum ? `<p class="card-text small mb-0">S${season} E${episodeNum}</p>` : ''}
                                    </div>
                                </div>
                            </div>`;
                        gridContainer.append(cardHtml);
                    });
                    $(`#${pageNumId}`).text(page);
                    $(`#${prevBtnId}, #${nextBtnId}`).removeClass('d-none');
                    if (page === 1) $(`#${prevBtnId}`).addClass('d-none');
                    if (data.result.length < 20) { // Assuming 20 items per page, hide next if fewer
                        $(`#${nextBtnId}`).addClass('d-none');
                    }
                } else {
                    gridContainer.html('<div class="col"><p>No items found.</p></div>');
                    $(`#${nextBtnId}`).addClass('d-none');
                    if (page === 1) $(`#${prevBtnId}`).addClass('d-none');
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.error(`Failed to load latest ${type}:`, textStatus, errorThrown, jqXHR.responseText);
                displayError(`Failed to load latest ${type}. Check console for details.`);
                gridContainer.html('<div class="col"><p>Error loading data.</p></div>');
            }
        });
    }

    $('#loadLatestMovies').on('click', function() { currentMoviesPage = 1; fetchLatest('movies', currentMoviesPage, 'latestMoviesList', 'moviesPageNum', 'prevMoviesPage', 'nextMoviesPage'); });
    $('#prevMoviesPage').on('click', function() { if (currentMoviesPage > 1) { currentMoviesPage--; fetchLatest('movies', currentMoviesPage, 'latestMoviesList', 'moviesPageNum', 'prevMoviesPage', 'nextMoviesPage'); } });
    $('#nextMoviesPage').on('click', function() { currentMoviesPage++; fetchLatest('movies', currentMoviesPage, 'latestMoviesList', 'moviesPageNum', 'prevMoviesPage', 'nextMoviesPage'); });

    $('#loadLatestTvShows').on('click', function() { currentTvShowsPage = 1; fetchLatest('tvshows', currentTvShowsPage, 'latestTvShowsList', 'tvShowsPageNum', 'prevTvShowsPage', 'nextTvShowsPage'); });
    $('#prevTvShowsPage').on('click', function() { if (currentTvShowsPage > 1) { currentTvShowsPage--; fetchLatest('tvshows', currentTvShowsPage, 'latestTvShowsList', 'tvShowsPageNum', 'prevTvShowsPage', 'nextTvShowsPage'); } });
    $('#nextTvShowsPage').on('click', function() { currentTvShowsPage++; fetchLatest('tvshows', currentTvShowsPage, 'latestTvShowsList', 'tvShowsPageNum', 'prevTvShowsPage', 'nextTvShowsPage'); });

    $('#loadLatestEpisodes').on('click', function() { currentEpisodesPage = 1; fetchLatest('episodes', currentEpisodesPage, 'latestEpisodesList', 'episodesPageNum', 'prevEpisodesPage', 'nextEpisodesPage'); });
    $('#prevEpisodesPage').on('click', function() { if (currentEpisodesPage > 1) { currentEpisodesPage--; fetchLatest('episodes', currentEpisodesPage, 'latestEpisodesList', 'episodesPageNum', 'prevEpisodesPage', 'nextEpisodesPage'); } });
    $('#nextEpisodesPage').on('click', function() { currentEpisodesPage++; fetchLatest('episodes', currentEpisodesPage, 'latestEpisodesList', 'episodesPageNum', 'prevEpisodesPage', 'nextEpisodesPage'); });

    // Click handler for items in the "latest" content cards
    $(document).on('click', '.latest-item-card', function(e) {
        e.preventDefault();
        // hideAllSections(true); // Don't hide sections, just populate search

        const searchId = $(this).data('search-id'); // This should be the ID to search for (TMDB or IMDb)
        const itemType = $(this).data('type'); // 'movie', 'tv', or 'episode'
        const displayTitle = $(this).data('display-title'); // Title to put in search box (could be movie/show/episode title)
        const season = $(this).data('season');
        const episode = $(this).data('episode');
        const showTmdbId = $(this).data('show-tmdb-id');
        const showImdbId = $(this).data('show-imdb-id');

        let targetSearchType = '';
        let idToSearch = searchId;

        if (itemType === 'movie') {
            targetSearchType = 'movie-embed'; // Or 'movie' if we want OMDb details first
        } else if (itemType === 'tv') {
            targetSearchType = 'tv-embed'; // Or 'tv'
        } else if (itemType === 'episode') {
            targetSearchType = 'episode-embed';
            idToSearch = showTmdbId || showImdbId || searchId; // For episodes, search by show's ID
            if (season) $('#seasonInput').val(season);
            if (episode) $('#episodeInput').val(episode);
        }

        if (!idToSearch) {
            displayError("No valid ID found for this item to initiate a search.");
            // Fallback to title search if ID is missing, though embed types prefer IDs
            // $('#searchInput').val(displayTitle);
            // if (itemType === 'movie') $('#searchType').val('movie'); // OMDb title search
            // else if (itemType === 'tv') $('#searchType').val('tv'); // OMDb title search
            return;
        }

        $('#searchInput').val(idToSearch); // Populate with ID for embed types
        // $('#searchInput').val(displayTitle); // Or populate with Title if preferring OMDb search first

        $('#searchType').val(targetSearchType).trigger('change'); // Set type and trigger its change handler

        // Scroll to top to see search bar
        $('html, body').animate({ scrollTop: 0 }, 300);
        $('#searchInput').focus();

        // Optionally, trigger search:
        // $('#searchButton').click();
    });


    // --- Utility Functions ---
    function displayError(message) {
        $('#errorAlert').text(message).removeClass('d-none');
        // Optionally hide other content sections when a major error occurs
        // $('#omdbDetailsCard').addClass('d-none');
        // $('#videoPlayerSection').addClass('d-none');
    }

    function hideError() {
        $('#errorAlert').addClass('d-none');
    }

    function hideAllSections(keepError = false) {
        $('#omdbDetailsCard').addClass('d-none');
        $('#videoPlayerSection').addClass('d-none');
        $('#vidsrcFrame').attr('src', ''); // Stop video
        $('#playOmdbItemButton').addClass('d-none');
        currentOmdbData = null;
        if (!keepError) {
            hideError();
        }
    }

    // Allow search on pressing Enter in input fields
    $('#searchInput, #seasonInput, #episodeInput').on('keypress', function(e) {
        if (e.which === 13) { // Enter key pressed
            // If suggestions are visible, Enter might select one, otherwise search
            if ($('#suggestionsDropdown').is(':visible') && $('#suggestionsDropdown .list-group-item.active').length) {
                $('#suggestionsDropdown .list-group-item.active').click();
                return; // Avoid triggering search button if suggestion is selected
            }
            $('#searchButton').click();
        }
    });

    // --- Autocomplete Functionality ---
    let debounceTimer;
    $('#searchInput').on('keyup', function(e) {
        const query = $(this).val().trim();
        const suggestionsDropdown = $('#suggestionsDropdown');

        // Clear previous timer
        clearTimeout(debounceTimer);

        if (query.length < 3) { // Minimum characters to trigger autocomplete
            suggestionsDropdown.hide().empty();
            return;
        }

        // Ignore up/down/enter keys for this specific handler to allow navigation
        if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
            return;
        }

        debounceTimer = setTimeout(() => {
            const searchType = $('#searchType').val();
            let omdbSearchType = '';
            if (searchType === 'movie' || searchType === 'movie-embed') {
                omdbSearchType = 'movie';
            } else if (searchType === 'tv' || searchType === 'tv-embed' || searchType === 'episode-embed') {
                omdbSearchType = 'series';
            } else {
                suggestionsDropdown.hide().empty();
                return; // Only provide suggestions for movies/series
            }

            $.ajax({
                url: omdbBaseUrl,
                method: 'GET',
                dataType: 'json',
                data: {
                    apikey: omdbApiKey,
                    s: query, // 's' parameter for search by title (multiple results)
                    type: omdbSearchType
                },
                success: function(data) {
                    suggestionsDropdown.empty();
                    if (data.Response === "True" && data.Search) {
                        data.Search.slice(0, 5).forEach(item => { // Show top 5 suggestions
                            const suggestionItem = $(`<a href="#" class="list-group-item list-group-item-action suggestion-item">${item.Title} (${item.Year})</a>`);
                            suggestionItem.on('click', function(e) {
                                e.preventDefault();
                                $('#searchInput').val(item.Title); // Fill input with selected title
                                suggestionsDropdown.hide().empty();
                                // Optionally, trigger search directly:
                                // $('#searchButton').click();
                            });
                            suggestionsDropdown.append(suggestionItem);
                        });
                        if (data.Search.length > 0) {
                            suggestionsDropdown.show();
                        } else {
                            suggestionsDropdown.hide();
                        }
                    } else {
                        suggestionsDropdown.hide();
                    }
                },
                error: function() {
                    console.error("Error fetching autocomplete suggestions.");
                    suggestionsDropdown.hide().empty();
                }
            });
        }, 300); // Debounce time in ms
    });

    // Keyboard navigation for suggestions
    $('#searchInput').on('keydown', function(e) {
        const suggestionsDropdown = $('#suggestionsDropdown');
        if (!suggestionsDropdown.is(':visible') || suggestionsDropdown.children().length === 0) {
            return;
        }

        let currentActive = suggestionsDropdown.find('.list-group-item.active');

        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (currentActive.length === 0) {
                suggestionsDropdown.children().first().addClass('active');
            } else {
                currentActive.removeClass('active');
                let next = currentActive.next();
                if (next.length === 0) { // If at the end, cycle to first
                    next = suggestionsDropdown.children().first();
                }
                next.addClass('active');
            }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (currentActive.length === 0) {
                suggestionsDropdown.children().last().addClass('active');
            } else {
                currentActive.removeClass('active');
                let prev = currentActive.prev();
                if (prev.length === 0) { // If at the beginning, cycle to last
                    prev = suggestionsDropdown.children().last();
                }
                prev.addClass('active');
            }
        } else if (e.key === "Enter") {
            if (currentActive.length > 0) {
                e.preventDefault(); // Prevent form submission if handled by suggestion click
                currentActive.click();
            }
        } else if (e.key === "Escape") {
            suggestionsDropdown.hide().empty();
        }
    });


    // Hide suggestions when clicking outside
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.input-group').length) {
            $('#suggestionsDropdown').hide().empty();
        }
    });


    // Load latest movies by default on page load (optional)
    // fetchLatest('movies', currentMoviesPage, 'latestMoviesList', 'moviesPageNum', 'prevMoviesPage', 'nextMoviesPage');
});
