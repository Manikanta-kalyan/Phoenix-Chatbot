jQuery(document).ready(function($) {
var topicDistributionChart;
var interactionChart;
 if (!interactionChart) {
        var ctx = document.getElementById('interactionChart').getContext('2d');
        var interactionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Politics', 'Education', 'Health', 'Environment', 'Technology', 'Economy', 'Entertainment', 'Sports', 'Travel', 'Food', 'Chit-Chat', 'Error'],
                datasets: [{
                    label: 'Number of Interactions',
                    data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Initial data set to zero
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            if (Number.isInteger(value)) {
                                return value;
                            }
                        }
                    }

                    }
                }
            }
        });
    }

    if (!topicDistributionChart) {
        var pieCtx = document.getElementById('topic-distribution-chart').getContext('2d');
        topicDistributionChart = new Chart(pieCtx, {
            type: 'pie',
            data: {
                labels: ['Chit-Chat', 'Error', 'Wiki Bot'],
                datasets: [{
                    data: [0, 0, 0], // Initialize with zero counts
                    backgroundColor: ['#CDDC39', '#F7464A', '#36A2EB'] // Colors for each section
                }]
            }
        });
}

    function updateChart(topic) {
        // Find the index of the topic in the chart labels
        var topicIndex = interactionChart.data.labels.indexOf(topic);
        if (topicIndex !== -1) {
            // Increment the count for this topic
            interactionChart.data.datasets[0].data[topicIndex]++;
            // Update the chart
            interactionChart.update();
        }
    }

    function updatePieChart(topic) {
    // Identify if the topic is 'General' or 'Error'
    if (topic === 'Chit-Chat' || topic === 'Error') {
        var index = topicDistributionChart.data.labels.indexOf(topic);
        topicDistributionChart.data.datasets[0].data[index]++;
    } else {
        // Increment the count for 'All Topics Combined'
        var allTopicsIndex = topicDistributionChart.data.labels.indexOf('Wiki Bot');
        topicDistributionChart.data.datasets[0].data[allTopicsIndex]++;
    }

    // Update the pie chart
    topicDistributionChart.update();
}


    function resetChartData() {
        if (interactionChart) {
            // Assuming you have 12 topics including 'General' and 'Error'
            interactionChart.data.datasets[0].data = new Array(12).fill(0);
            interactionChart.update();
        }

        if (topicDistributionChart) {
            topicDistributionChart.data.datasets[0].data = [0, 0, 0];
            topicDistributionChart.update();
        }
    }

    jQuery(document).on('click', '.iconInner', function(e) {
        jQuery(this).parents('.botIcon').addClass('showBotSubject');
        //add default message
        var defaultMsg = 'Hi,I am Phoenix bot. Ask me anything?';
        $('.Messages_list').append('<div class="msg"><span class="avtr"><figure style="background-image: url(https://cdn3.iconfinder.com/data/icons/chatbot-5/500/yul291_8_robot_circle_chatbot_cute_linear_avatar_bot-512.png)"></figure></span><span class="responsText">' + defaultMsg + '</span></div>');
        jQuery(this).addClass('showBotSubject');
        $("[name='msg']").focus();
        //scroll to bottom
        var lastMsgId = $('.Messages_list').find('.msg').last()[0];
        lastMsgId.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    jQuery(document).on('click', '.closeBtn, .chat_close_icon', function(e) {
        jQuery(this).parents('.botIcon').removeClass('showBotSubject');
        jQuery(this).parents('.botIcon').removeClass('showMessenger');
    });

    jQuery(document).on('submit', '#botSubject', function(e) {
        e.preventDefault();

        jQuery(this).parents('.botIcon').removeClass('showBotSubject');
        jQuery(this).parents('.botIcon').addClass('showMessenger');
    });



    /* Chatboat Code */
    $(document).on("submit", "#messenger", function(e) {
        e.preventDefault();

        // Retrieve all checked topics
        var selectedTopics = [];
        $(".custom-checkbox input[type='checkbox']:checked").each(function() {
            selectedTopics.push($(this).val());
        });
        console.log("Selected topics: " + selectedTopics.join(","));

        var val = $("[name=msg]").val().toLowerCase();
        var mainval = $("[name=msg]").val();
        name = '';
        nowtime = new Date();
        nowhoue = nowtime.getHours();

        function userMsg(msg) {
            $('.Messages_list').append('<div class="msg user"><span class="avtr"><figure style="background-image: url(https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR5scpGwkGSFj8GcNRK3CQtaJ8yyebAXWV_ILFrmaDYW4ctD8-x8bZIX1LzooFUzFRzWdc&usqp=CAU)"></figure></span><span class="responsText">' + mainval + '</span></div>');
        };

        function appendMsg(msg) {
            $('.Messages_list').append('<div #id="bot-msg" class="msg"><span class="avtr"><figure style="background-image: url(https://cdn3.iconfinder.com/data/icons/chatbot-5/500/yul291_8_robot_circle_chatbot_cute_linear_avatar_bot-512.png)"></figure></span><span class="responsText">' + msg + '</span></div>');
            var lastMsgId = $('.Messages_list').find('.msg').last()[0];
            lastMsgId.scrollIntoView({ behavior: 'smooth', block: 'center' });
        };


        userMsg(mainval);
        $("[name='msg']").val("");


        var userData = { user_input: val };
        if (selectedTopics.length > 0) {
            userData.user_topics = selectedTopics.join(","); // Add user_topics only if selected
        }

            console.log("preparing to send: " + val + " with topics: " + selectedTopics.join(", "));
            // Append pending message UI
            $('.Messages_list').append('<div #id="bot-msg pending" class="msg">.....</div>');
            var lastMsgId = $('.Messages_list').find('.msg').last()[0];
            lastMsgId.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Animate the pending message
            var lastMsg = $('.Messages_list').find('.msg').last();
            lastMsg.addClass('loader');

            // Send AJAX request with the user data
            $.ajax({
                data: userData, // Send user input and formatted topics
                type: "POST",
                url: "http://34.16.175.2:5000/bot",
                crossDomain: true,
                contentType: 'application/x-www-form-urlencoded; charset=UTF-8'
            })
            .done(function(data) {
                // get the element of last m    essage
                console.log(data);

            var lastMsg = $('.Messages_list').find('.msg').last();
            lastMsg.remove();

            if (data && data.response) {
                var response = data.response;
                var response = data.response;
                var topic = response.topic || 'Chit-Chat'; // Default to 'General'
                if (response.error) {
                    topic = 'Error';
                }

                // Update the chart for the topic
                updateChart(topic);
                updatePieChart(topic);
            
            if (response.end === "Goodbye!") {
                    // Close the chatbox and clear the messages
                $('.botIcon').removeClass('showBotSubject').removeClass('showMessenger');
                $('.Messages_list').empty(); // Clears all messages
                resetChartData()
            } 
            
            else if (typeof response === 'string') {
            // If the response is a simple text message
                appendMsg(response);

            // No graph data update is expected for this response type
            } else if (response.summary && response.title && response.url) {
            // Handle TYPE 1 response as before
                var title = response.title;
                var summary = response.summary;
                var url = response.url;

                var msg = summary + ' <a href="' + url + '" target="_blank">' + title + '</a>';
                appendMsg(msg);

            }
            else if (response.error) {
                var errorMsg = response.error;
                appendMsg("<span style='color: red;'>" + errorMsg + "</span>");
            }
            else {
                console.error("Invalid or incomplete response from the backend.");
                }
            } else {
                console.error("Invalid response format from the backend.");
                }

            });
    });
    /* Chatboat Code */



})