-- BLOCK find_single_assessment_instance
SELECT
    ai.*
FROM
    assessment_instances AS ai
    LEFT JOIN groups AS gr ON gr.id = ai.group_id
    LEFT JOIN group_users AS gu ON (gu.group_id = gr.id)
WHERE
    ai.assessment_id = $assessment_id
    AND ai.number = 1
    AND ((gu.user_id = $user_id) OR (ai.user_id = $user_id))
    AND gr.deleted_at IS NULL;
